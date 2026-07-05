import { NextRequest, NextResponse } from 'next/server';
import { findSiteBySlugForPreview, getPublishedAsset, readAssetBody } from '@/lib/tenancy/site-publishing';
import { requireUser } from '@/lib/auth/server';

export async function GET(_: NextRequest, context: { params: Promise<unknown> }) {
  const auth = await requireUser();
  const { slug, asset } = (await context.params) as { slug: string; asset?: string[] };
  const site = await findSiteBySlugForPreview(slug, auth?.user.id);

  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!site.published && (!auth || site.userId !== auth.user.id)) {
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
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[site-preview] Failed to load asset:', error);
    return NextResponse.json({ error: 'Failed to load asset' }, { status: 502 });
  }
}
