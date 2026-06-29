import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getUserSubscription } from '@/lib/stripe/subscription';

export const dynamic = 'force-dynamic';

type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';

interface OpenAIImageResponse {
  data?: Array<{ url?: string }>;
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

    const { prompt, size = '1024x1024' } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const validSizes: ImageSize[] = ['1024x1024', '1792x1024', '1024x1792'];
    const imageSize: ImageSize = validSizes.includes(size as ImageSize) ? (size as ImageSize) : '1024x1024';

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.slice(0, 1000),
        n: 1,
        size: imageSize,
        response_format: 'url',
      }),
    });

    const data: OpenAIImageResponse = await res.json();

    if (!res.ok) {
      const msg = data.error?.message ?? `OpenAI error ${res.status}`;
      console.error('[generate-ai-image] OpenAI error:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    const url = data.data?.[0]?.url;
    if (!url) {
      return NextResponse.json({ success: false, error: 'No image returned' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Image generation failed';
    console.error('[generate-ai-image] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
