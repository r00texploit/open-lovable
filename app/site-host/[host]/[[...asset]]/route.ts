import { NextRequest, NextResponse } from 'next/server';
import { findSiteByHostname, getPublishedAsset } from '@/lib/tenancy/site-publishing';
import { decodeTenantHost, getRootDomain, getSubdomainFromHostname } from '@/lib/tenancy/hostname';
import { getSandboxUrlForSubdomain } from '@/lib/tenancy/preview-mapping';

export async function GET(request: NextRequest, context: { params: Promise<unknown> }) {
  const { host, asset } = (await context.params) as { host: string; asset?: string[] };
  const hostname = decodeTenantHost(host);
  const rootDomain = getRootDomain();

  // Redirect www and root domain to landing page - they should not be served by site-host
  if (hostname === `www.${rootDomain}` || hostname === rootDomain) {
    return NextResponse.redirect(new URL('/', `https://${rootDomain}`), 308);
  }

  const site = await findSiteByHostname(hostname);

  // If site is not published, check if there's an active preview (sandbox)
  if (!site || !site.published) {
    const subdomain = getSubdomainFromHostname(hostname);
    if (subdomain) {
      const sandboxUrl = getSandboxUrlForSubdomain(subdomain);
      if (sandboxUrl) {
        // Proxy to sandbox for live preview
        return proxyToSandbox(request, sandboxUrl, asset);
      }
    }
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
    const targetPath = asset ? `/${asset.join('/')}` : request.nextUrl.pathname;
    const targetUrl = new URL(targetPath, sandboxUrl);

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
