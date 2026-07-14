import { prisma } from './db/prisma';

function normalizeAssetPath(path: string): string {
  return path.replace(/^\.?\//, '');
}

export async function storeSiteAsset(
  siteId: string,
  path: string,
  contentType: string,
  content: Buffer
) {
  const normalizedPath = normalizeAssetPath(path);
  const bytes = new Uint8Array(content);
  try {
    await prisma.siteAsset.upsert({
      where: { siteId_path: { siteId, path: normalizedPath } },
      update: {
        content: bytes,
        contentType,
        size: bytes.length,
        updatedAt: new Date(),
      },
      create: {
        siteId,
        path: normalizedPath,
        content: bytes,
        contentType,
        size: bytes.length,
      },
    });
    console.log(`[site-assets] Stored ${normalizedPath} (${content.length} bytes) for site ${siteId}`);
  } catch (error) {
    console.error(`[site-assets] Failed to store ${normalizedPath} for site ${siteId}:`, error);
    throw error;
  }
}

export async function getSiteAssets(siteId: string) {
  return prisma.siteAsset.findMany({
    where: { siteId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function restoreSiteAssets(siteId: string, provider: any): Promise<{ restored: number; errors: string[] }> {
  const assets = await getSiteAssets(siteId);
  if (assets.length === 0) {
    return { restored: 0, errors: [] };
  }

  // Ensure public/images directory exists
  try {
    await provider.runCommand('mkdir -p public/images');
  } catch (err: any) {
    console.warn('[site-assets] Failed to create public/images directory:', err.message);
  }

  const files = assets.map(asset => ({
    path: asset.path,
    content: Buffer.isBuffer(asset.content) ? asset.content : Buffer.from(asset.content),
  }));

  try {
    await provider.writeFiles(files);
    console.log(`[site-assets] Restored ${files.length} asset(s) for site ${siteId}`);
    return { restored: files.length, errors: [] };
  } catch (error: any) {
    console.error(`[site-assets] Failed to restore assets for site ${siteId}:`, error);
    return { restored: 0, errors: [error.message] };
  }
}

export function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path);
}
