import type { Site, SiteAsset } from '@prisma/client';
import { del, put } from '@vercel/blob';
import type { SandboxProvider } from '@/lib/sandbox/types';
import { prisma } from '@/lib/db/prisma';
import { getSubdomainFromHostname, isCustomDomainHost } from '@/lib/tenancy/hostname';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

export function getContentTypeForPath(path: string) {
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPES[extension] || 'application/octet-stream';
}

// Vite emits content-hashed filenames under assets/ (e.g. index-Ab3xK9.js),
// so those can be cached forever; HTML must revalidate quickly so republishing
// takes effect within a minute.
export function getCacheControlForPath(path: string) {
  if (path.startsWith('assets/') || /-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(path)) {
    return 'public, max-age=31536000, immutable';
  }
  if (path.endsWith('.html')) {
    return 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
  }
  return 'public, max-age=300, s-maxage=3600';
}

export function isBlobStorageConfigured() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function buildSiteSnapshot(provider: SandboxProvider) {
  const buildResult = await provider.runCommand('npm run build');
  if (!buildResult.success) {
    throw new Error(buildResult.stderr || 'Build failed inside sandbox');
  }

  const files = await readDistFiles(provider);
  if (!files.length) {
    throw new Error('No build output found in dist');
  }

  return files.map((file) => ({
    ...file,
    path: file.path.replace(/^dist\//, ''),
    contentType: getContentTypeForPath(file.path),
  }));
}

export async function publishSiteSnapshot(
  siteId: string,
  files: Array<{ path: string; contentType: string; content: Buffer; size: number }>
) {
  const useBlob = isBlobStorageConfigured();

  const previousAssets = useBlob
    ? await prisma.siteAsset.findMany({
        where: { siteId, blobUrl: { not: null } },
        select: { blobUrl: true },
      })
    : [];

  const assetRows = await Promise.all(
    files.map(async (file) => {
      const path = normalizePublishedPath(file.path);
      if (!useBlob) {
        return {
          siteId,
          path,
          contentType: file.contentType,
          content: Uint8Array.from(file.content),
          blobUrl: null as string | null,
          size: file.size,
        };
      }

      const blob = await put(`sites/${siteId}/${path}`, file.content, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: file.contentType,
        cacheControlMaxAge: 31536000,
      });

      return {
        siteId,
        path,
        contentType: file.contentType,
        content: null,
        blobUrl: blob.url,
        size: file.size,
      };
    })
  );

  await prisma.$transaction([
    prisma.siteAsset.deleteMany({ where: { siteId } }),
    prisma.site.update({
      where: { id: siteId },
      data: {
        published: true,
        lastPublishedAt: new Date(),
      },
    }),
    prisma.siteAsset.createMany({ data: assetRows }),
  ]);

  // Remove blobs that the new build no longer produces (overwritten paths keep
  // their URL, so only stale paths remain). Failures here must not fail the
  // publish — orphaned blobs are harmless.
  if (useBlob) {
    const currentUrls = new Set(assetRows.map((row) => row.blobUrl).filter(Boolean));
    const staleUrls = previousAssets
      .map((asset) => asset.blobUrl)
      .filter((url): url is string => !!url && !currentUrls.has(url));
    if (staleUrls.length) {
      await del(staleUrls).catch((error) => {
        console.error('[site-publishing] Failed to delete stale blobs:', error);
      });
    }
  }
}

export async function deleteSiteAssets(siteId: string) {
  const assets = await prisma.siteAsset.findMany({
    where: { siteId, blobUrl: { not: null } },
    select: { blobUrl: true },
  });
  const urls = assets.map((asset) => asset.blobUrl).filter((url): url is string => !!url);
  if (urls.length) {
    await del(urls).catch((error) => {
      console.error('[site-publishing] Failed to delete site blobs:', error);
    });
  }
  await prisma.siteAsset.deleteMany({ where: { siteId } });
}

export function normalizePublishedPath(path: string) {
  const normalized = path.replace(/^\/+/, '');
  return normalized || 'index.html';
}

export async function findSiteByHostname(hostname: string) {
  const subdomain = getSubdomainFromHostname(hostname);
  return prisma.site.findFirst({
    where: {
      OR: [
        ...(isCustomDomainHost(hostname) ? [{ customDomain: hostname, customDomainVerified: true }] : []),
        ...(subdomain ? [{ subdomain }] : []),
      ],
    },
  });
}

export async function findSiteBySlugForPreview(slug: string, userId?: string | null) {
  const where: { slug: string; OR?: Array<{ published: true } | { userId: string }> } = { slug };
  if (userId) {
    where.OR = [{ published: true }, { userId }];
  } else {
    where.OR = [{ published: true }];
  }

  return prisma.site.findFirst({ where });
}

export async function getPublishedAsset(site: Site, assetPath?: string[] | string) {
  const targetPath = normalizePublishedPath(
    Array.isArray(assetPath)
      ? assetPath.length > 0
        ? assetPath.join('/')
        : 'index.html'
      : assetPath || 'index.html'
  );

  const asset = await prisma.siteAsset.findUnique({
    where: {
      siteId_path: {
        siteId: site.id,
        path: targetPath,
      },
    },
  });

  if (asset) {
    return asset;
  }

  // SPA fallback: generated sites use client-side routing, so extensionless
  // paths (/about, /pricing) must serve index.html instead of 404ing.
  const lastSegment = targetPath.split('/').pop() || '';
  if (targetPath !== 'index.html' && !lastSegment.includes('.')) {
    return prisma.siteAsset.findUnique({
      where: {
        siteId_path: {
          siteId: site.id,
          path: 'index.html',
        },
      },
    });
  }

  return null;
}

export async function readAssetBody(asset: SiteAsset): Promise<Uint8Array<ArrayBuffer>> {
  if (asset.blobUrl) {
    const response = await fetch(asset.blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch asset from blob storage (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  if (asset.content) {
    return Uint8Array.from(asset.content);
  }

  throw new Error(`Asset ${asset.path} has neither blob URL nor inline content`);
}

async function readDistFiles(provider: SandboxProvider) {
  // Emit every dist file in one command as delimited base64 blocks —
  // one sandbox round trip instead of one per file.
  const marker = '__NOERON_FILE__';
  const result = await provider.runCommand(
    `cd /vercel/sandbox && find dist -type f | sort | while IFS= read -r f; do printf '%s%s\\n' "${marker}" "$f"; base64 "$f" | tr -d '\\n'; printf '\\n'; done`
  );
  if (!result.success && result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to read dist files');
  }

  const files: Array<{ path: string; content: Buffer; size: number }> = [];
  const blocks = result.stdout.split(marker).filter(Boolean);
  for (const block of blocks) {
    const newlineIndex = block.indexOf('\n');
    if (newlineIndex === -1) continue;
    const path = block.slice(0, newlineIndex).trim();
    const base64 = block.slice(newlineIndex + 1).replace(/\s/g, '');
    if (!path) continue;
    const content = Buffer.from(base64, 'base64');
    files.push({ path, content, size: content.byteLength });
  }

  if (!files.length) {
    throw new Error('No files found in dist directory');
  }

  return files;
}

