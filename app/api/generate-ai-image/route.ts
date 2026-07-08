import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getUserSubscription } from '@/lib/stripe/subscription';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

export const dynamic = 'force-dynamic';

// gpt-image-1 supported sizes. DALL·E-3 landscape/portrait (1792x1024 /
// 1024x1792) map to the nearest gpt-image-1 aspect ratio.
type ImageSize = '1024x1024' | '1536x1024' | '1024x1536';

function mapSize(requested: unknown): ImageSize {
  switch (requested) {
    case '1792x1024':
    case '1536x1024':
      return '1536x1024';
    case '1024x1792':
    case '1024x1536':
      return '1024x1536';
    default:
      return '1024x1024';
  }
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message: string };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const subscription = await getUserSubscription(session.user.id);
    if (!['plus', 'team'].includes(subscription.tier)) {
      return NextResponse.json(
        { success: false, error: 'AI Images requires Plus or Team plan', upgradeUrl: '/pricing' },
        { status: 403 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const { prompt, size = '1024x1024', sandboxId } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const imageSize = mapSize(size);

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt.slice(0, 1000),
        n: 1,
        size: imageSize,
        // Medium quality keeps cost/latency reasonable for image-heavy pages
        // (a site can request a dozen-plus images in one generation).
        quality: 'medium',
        // gpt-image-1 always returns base64; ask for compact webp output.
        output_format: 'webp',
      }),
    });

    const data: OpenAIImageResponse = await res.json();

    if (!res.ok) {
      const msg = data.error?.message ?? `OpenAI error ${res.status}`;
      console.error('[generate-ai-image] OpenAI error:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error('[generate-ai-image] No image data returned from OpenAI');
      return NextResponse.json({ success: false, error: 'No image returned' }, { status: 502 });
    }

    // Persist the image as a real file in the sandbox instead of hotlinking an
    // expiring provider URL. Written under public/ so Vite serves it at a stable
    // path and `npm run build` copies it into dist/ for the published site.
    if (!sandboxId || typeof sandboxId !== 'string') {
      return NextResponse.json({ success: false, error: 'sandboxId is required to persist the image' }, { status: 400 });
    }

    const resolved = await resolveRequestSandbox(sandboxId);
    if (!resolved.ok) {
      return resolved.response;
    }

    const hash = createHash('sha256').update(prompt).digest('hex').slice(0, 12);
    const publicPath = `/generated/ai-${hash}.webp`;
    const sandboxPath = `public${publicPath}`;

    try {
      await resolved.value.provider.writeFiles([
        { path: sandboxPath, content: Buffer.from(b64, 'base64') },
      ]);
    } catch (writeError) {
      const msg = writeError instanceof Error ? writeError.message : 'Failed to write image to sandbox';
      console.error('[generate-ai-image] Failed to persist image:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    // Return the stable public path (served by Vite, durable across the site's
    // lifetime). `url` kept for backward compatibility with older callers.
    return NextResponse.json({ success: true, path: publicPath, url: publicPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Image generation failed';
    console.error('[generate-ai-image] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
