import { NextRequest, NextResponse } from 'next/server';

// GET /api/probe-url?url=https://sb-xxx.vercel.run
// Server-side HEAD probe so the client can see the actual HTTP status code
// (client-side no-cors fetch can't distinguish 200 from 410).
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'manual' });
    clearTimeout(timeout);
    return NextResponse.json({ status: res.status, ok: res.status >= 200 && res.status < 400 });
  } catch (err: any) {
    return NextResponse.json({ status: 0, ok: false, error: err.message });
  }
}
