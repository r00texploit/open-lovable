import { NextRequest, NextResponse } from 'next/server';
import { findSiteBySlugForPreview, getPublishedAsset } from '@/lib/tenancy/site-publishing';
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

  return new NextResponse(Buffer.from(publishedAsset.content), {
    status: 200,
    headers: {
      'Content-Type': publishedAsset.contentType,
      'Cache-Control': 'private, no-store',
    },
  });
}
