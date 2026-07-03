import { NextRequest, NextResponse } from 'next/server';
import { findSiteByHostname, getPublishedAsset } from '@/lib/tenancy/site-publishing';
import { decodeTenantHost, getRootDomain, isTenantSubdomainHost } from '@/lib/tenancy/hostname';
import { prisma } from '@/lib/db/prisma';
import { ensureSessionSandboxRunning, persistSandboxRuntime } from '@/lib/sandbox/persistent-sandbox';

export async function GET(request: NextRequest, context: { params: Promise<unknown> }) {
  const { host, asset } = (await context.params) as { host: string; asset?: string[] };
  const rootDomain = getRootDomain();
  const decodedHost = decodeTenantHost(host);
  const hostname = decodedHost.includes('.') ? decodedHost : `${decodedHost}.${rootDomain}`;

  // Redirect www and root domain to landing page - they should not be served by site-host
  if (hostname === `www.${rootDomain}` || hostname === rootDomain) {
    return NextResponse.redirect(new URL('/', `https://${rootDomain}`), 308);
  }

  const site = await findSiteByHostname(hostname);

  if (site && isTenantSubdomainHost(hostname)) {
    const previewSession = await prisma.generationSession.findFirst({
      where: {
        siteId: site.id,
        sandboxProvider: 'vercel',
        OR: [
          { rawSandboxUrl: { not: null } },
          { sandboxName: { not: null } },
        ],
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    if (previewSession) {
      try {
        const { info } = await ensureSessionSandboxRunning(previewSession);
        await persistSandboxRuntime(previewSession.id, info, `https://${hostname}`);
        return proxyToSandbox(request, info.url, asset);
      } catch (error) {
        console.error('[site-host] Failed to resume sandbox preview:', error);
        if (!site.published) {
          return NextResponse.json(
            { error: 'Preview waking up. Please retry in a moment.' },
            { status: 503, headers: { 'Retry-After': '3' } }
          );
        }
      }
    }
  }

  if (!site || !site.published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const publishedAsset = await getPublishedAsset(site, asset);
  if (!publishedAsset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(Buffer.from(publishedAsset.content), {
    status: 200,
    headers: {
      'Content-Type': publishedAsset.contentType,
      'Cache-Control': 'public, max-age=60',
    },
  });
}

/**
 * Proxy request to sandbox URL for live preview
 */
async function proxyToSandbox(
  request: NextRequest,
  sandboxUrl: string,
  asset?: string[]
): Promise<NextResponse> {
  try {
    // Build the target URL
    const targetPath = asset && asset.length > 0 ? `/${asset.join('/')}` : '/';
    const targetUrl = new URL(targetPath, sandboxUrl);
    targetUrl.search = request.nextUrl.search;

    // Copy relevant headers
    const headers = new Headers(request.headers);
    headers.delete('host'); // Let the fetch set the correct host

    // Forward the request to the sandbox
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    // Create response with appropriate headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Proxy-Source', 'sandbox-preview');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[site-host] Proxy error:', error);
    return NextResponse.json({ error: 'Preview unavailable' }, { status: 502 });
  }
}
