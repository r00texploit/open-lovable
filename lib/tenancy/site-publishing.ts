import type { Site } from '@prisma/client';
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
    path: file.path === 'index.html' ? 'index.html' : file.path.replace(/^dist\//, ''),
    contentType: getContentTypeForPath(file.path),
  }));
}

export async function publishSiteSnapshot(siteId: string, files: Array<{ path: string; contentType: string; content: Buffer; size: number }>) {
  await prisma.$transaction([
    prisma.siteAsset.deleteMany({ where: { siteId } }),
    prisma.site.update({
      where: { id: siteId },
      data: {
        published: true,
        lastPublishedAt: new Date(),
      },
    }),
    prisma.siteAsset.createMany({
      data: files.map((file) => ({
        siteId,
        path: normalizePublishedPath(file.path),
        contentType: file.contentType,
        content: Uint8Array.from(file.content),
        size: file.size,
      })),
    }),
  ]);
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
        ...(isCustomDomainHost(hostname) ? [{ customDomain: hostname }] : []),
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

  return prisma.siteAsset.findUnique({
    where: {
      siteId_path: {
        siteId: site.id,
        path: targetPath,
      },
    },
  });
}

async function readDistFiles(provider: SandboxProvider) {
  const listResult = await provider.runCommand('cd /vercel/sandbox && find dist -type f | sort');
  if (!listResult.success && listResult.exitCode !== 0) {
    throw new Error(listResult.stderr || 'Failed to list dist files');
  }

  const fileList = listResult.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (!fileList.length) {
    throw new Error('No files found in dist directory');
  }

  const files: Array<{ path: string; content: Buffer; size: number }> = [];
  for (const filePath of fileList) {
    const fileResult = await provider.runCommand(
      `cd /vercel/sandbox && base64 "${filePath}" | tr -d '\\n' && printf '\\n' && wc -c < "${filePath}"`
    );
    if (!fileResult.success && fileResult.exitCode !== 0) {
      throw new Error(fileResult.stderr || `Failed to read ${filePath}`);
    }
    const lines = fileResult.stdout.trim().split('\n');
    const size = Number(lines.pop() || '0');
    const base64 = lines.join('');
    files.push({ path: filePath, content: Buffer.from(base64, 'base64'), size });
  }

  return rewriteIndexHtml(files);
}

function rewriteIndexHtml(files: Array<{ path: string; content: Buffer; size: number }>) {
  return files.map((file) => {
    if (file.path !== 'dist/index.html') {
      return file;
    }

    const rewritten = file.content
      .toString('utf8')
      // Keep absolute paths starting with /assets/
      // The site-preview route will rewrite these to include the slug prefix
      .replace(/(src|href)="\/(assets\/[^"]+)"/g, '$1="/$2"');

    return {
      ...file,
      content: Buffer.from(rewritten, 'utf8'),
      size: Buffer.byteLength(rewritten),
    };
  });
}


