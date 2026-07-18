import { NextRequest, NextResponse } from 'next/server';
import { restoreSiteAssets, isImagePath } from '@/lib/site-assets';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

// POST /api/restore-files — write saved files back into a sandbox after recreation
// or reset, including binary image assets stored in SiteAsset.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      sandboxId: string;
      files: Record<string, string>;
      siteId?: string;
    };
    const { sandboxId, files } = body;
    let { siteId } = body;

    if (!sandboxId || !files || typeof files !== 'object') {
      return NextResponse.json({ error: 'sandboxId and files are required' }, { status: 400 });
    }

    const resolved = await resolveRequestSandbox(sandboxId);
    if (!resolved.ok) {
      return resolved.response;
    }
    const provider = resolved.value.provider;

    const ownedSiteId = resolved.value.session?.siteId ?? undefined;
    if (siteId && siteId !== ownedSiteId) {
      return NextResponse.json({ error: 'Site does not belong to this sandbox session' }, { status: 403 });
    }
    siteId = ownedSiteId;

    const entries = Object.entries(files);
    let written = 0;
    const errors: string[] = [];

    // Write text/code files, skipping image placeholders — those are restored
    // from SiteAsset as binary below.
    for (const [path, content] of entries) {
      if (isImagePath(path) && content.startsWith('[Binary image')) {
        continue;
      }
      try {
        await provider.writeFile(path, content);
        written++;
      } catch (err: any) {
        errors.push(`${path}: ${err.message}`);
      }
    }

    // Restore binary image assets from durable SiteAsset storage.
    if (siteId) {
      try {
        const assetResult = await restoreSiteAssets(siteId, provider);
        written += assetResult.restored;
        errors.push(...assetResult.errors);
        console.log(`[restore-files] Restored ${assetResult.restored} image asset(s) for site ${siteId}`);
      } catch (assetErr: any) {
        console.warn('[restore-files] Failed to restore image assets:', assetErr);
        errors.push(`image-assets: ${assetErr.message}`);
      }
    }

    return NextResponse.json({ success: true, written, errors });
  } catch (error: any) {
    console.error('[restore-files] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
