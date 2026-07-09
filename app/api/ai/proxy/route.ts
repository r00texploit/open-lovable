import { NextRequest, NextResponse } from 'next/server';
import { resolveProxyToken, type AiProvider } from '@/lib/ai/credentials';

export const dynamic = 'force-dynamic';

// Runtime proxy called by GENERATED sites (public, cross-origin). The site sends
// its opaque proxyToken; we look up and decrypt the owner's key server-side and
// forward to the provider. The raw key never reaches the browser.

// Model allowlist so a leaked token can't be used to call arbitrary expensive
// models. Keyed by provider.
const ALLOWED_MODELS: Record<AiProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
};
const DEFAULT_MODEL: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
};

const MAX_MESSAGES = 30;
const MAX_TOKENS_CAP = 1024;

// Best-effort per-token rate limit. In-memory, so it is per-instance only; a
// durable store (Redis/DB) is the production upgrade for hard quotas.
const RATE_LIMIT = 20; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const hits = new Map<string, number[]>();

function rateLimited(token: string): boolean {
  const now = Date.now();
  const recent = (hits.get(token) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(token, recent);
  return recent.length > RATE_LIMIT;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-proxy-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, { status, headers: cors });

  let payload: {
    proxyToken?: string;
    messages?: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const proxyToken = request.headers.get('x-proxy-token') || payload.proxyToken;
  if (!proxyToken || typeof proxyToken !== 'string') {
    return json({ error: 'Missing proxy token' }, 401);
  }

  if (rateLimited(proxyToken)) {
    return json({ error: 'Rate limit exceeded, slow down' }, 429);
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return json({ error: 'messages is required' }, 400);
  }
  if (payload.messages.length > MAX_MESSAGES) {
    return json({ error: `Too many messages (max ${MAX_MESSAGES})` }, 400);
  }

  const resolved = await resolveProxyToken(proxyToken);
  if (!resolved) {
    return json({ error: 'Invalid or revoked proxy token' }, 401);
  }

  const { apiKey, provider } = resolved;
  const model =
    payload.model && ALLOWED_MODELS[provider].includes(payload.model)
      ? payload.model
      : DEFAULT_MODEL[provider];
  const maxTokens = Math.min(payload.max_tokens ?? 512, MAX_TOKENS_CAP);

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: payload.messages,
          temperature: payload.temperature ?? 0.7,
          max_tokens: maxTokens,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return json({ error: data.error?.message ?? `OpenAI error ${res.status}` }, 502);
      }
      return json({ success: true, content: data.choices?.[0]?.message?.content ?? '', raw: data });
    }

    // anthropic
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: payload.messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return json({ error: data.error?.message ?? `Anthropic error ${res.status}` }, 502);
    }
    const content = Array.isArray(data.content)
      ? data.content.map((b: { text?: string }) => b.text ?? '').join('')
      : '';
    return json({ success: true, content, raw: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy request failed';
    console.error('[ai-proxy] Error:', message);
    return json({ error: message }, 500);
  }
}
