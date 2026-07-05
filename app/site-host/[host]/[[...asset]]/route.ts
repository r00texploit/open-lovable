import { NextRequest, NextResponse } from 'next/server';
import {
  findSiteByHostname,
  getCacheControlForPath,
  getPublishedAsset,
  readAssetBody,
} from '@/lib/tenancy/site-publishing';
import { decodeTenantHost, getRootDomain } from '@/lib/tenancy/hostname';

export async function GET(request: NextRequest, context: { params: Promise<unknown> }) {
  const { host, asset } = (await context.params) as { host: string; asset?: string[] };
  const hostname = decodeTenantHost(host);
  const rootDomain = getRootDomain();

  // Redirect www and root domain to landing page - they should not be served by site-host
  if (hostname === `www.${rootDomain}` || hostname === rootDomain) {
    return NextResponse.redirect(new URL('/', `https://${rootDomain}`), 308);
  }

  const site = await findSiteByHostname(hostname);

  if (!site || !site.published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const publishedAsset = await getPublishedAsset(site, asset);
  if (!publishedAsset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await readAssetBody(publishedAsset);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': publishedAsset.contentType,
        'Cache-Control': getCacheControlForPath(publishedAsset.path),
      },
    });
  } catch (error) {
    console.error('[site-host] Failed to load asset:', error);
    return NextResponse.json({ error: 'Failed to load asset' }, { status: 502 });
  }
}
