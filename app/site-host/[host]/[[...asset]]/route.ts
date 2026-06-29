import { NextRequest, NextResponse } from 'next/server';
import { findSiteByHostname, getPublishedAsset } from '@/lib/tenancy/site-publishing';
import { decodeTenantHost } from '@/lib/tenancy/hostname';

export async function GET(request: NextRequest, context: { params: Promise<unknown> }) {
  const { host, asset } = (await context.params) as { host: string; asset?: string[] };
  const hostname = decodeTenantHost(host);

  // Debug logging - remove after fixing
  console.log('[site-host] Request URL:', request.url);
  console.log('[site-host] Host param:', host);
  console.log('[site-host] Decoded hostname:', hostname);
  console.log('[site-host] Asset:', asset);

  const site = await findSiteByHostname(hostname);

  if (!site || !site.published) {
    console.log('[site-host] Site not found or not published:', { site: !!site, published: site?.published });
    return NextResponse.json({ error: 'Not found', hostname }, { status: 404 });
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
