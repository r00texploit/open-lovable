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
    let content: Uint8Array<ArrayBuffer> = await readAssetBody(publishedAsset);

    // For HTML files, rewrite asset paths to include the slug prefix
    // This ensures assets load correctly when served from /site-preview/[slug]/
    if (publishedAsset.contentType?.includes('text/html')) {
      const html = Buffer.from(content).toString();
      const rewritten = html.replace(
        /(src|href)="\/(assets\/[^"]+)"/g,
        `$1="/site-preview/${slug}/$2"`
      );
      content = new Uint8Array(Buffer.from(rewritten));
    }

    return new NextResponse(content, {
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
