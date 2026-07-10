/**
 * Inspect what a site actually has stored in the DB.
 *
 * Usage (needs DATABASE_URL in env, e.g. `vercel env pull` or your prod URL):
 *   npx tsx scripts/inspect-site.ts JANOV
 *   npx tsx scripts/inspect-site.ts janov     # matches name/slug/subdomain, case-insensitive
 *
 * Prints: the Site row, its GenerationSessions, and for each session's
 * fileCache — how many files, how many are *real* source vs. bare Vite
 * template, and the file list. Also reports published SiteAsset count.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Same "template-only" heuristic the editor uses to decide if a sandbox holds
// real code or just the scaffold.
const TEMPLATE_ONLY = new Set([
  'src/App.tsx', 'src/App.jsx', 'src/main.tsx', 'src/main.jsx', 'src/index.css',
  'index.html', 'package.json', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js',
]);

function fileList(fileCache: unknown): string[] {
  if (!fileCache || typeof fileCache !== 'object') return [];
  const cache = (fileCache as any).files ?? fileCache;
  if (!cache || typeof cache !== 'object') return [];
  return Object.keys(cache);
}

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error('Pass a site name/slug, e.g.  npx tsx scripts/inspect-site.ts JANOV');
    process.exit(1);
  }

  const sites = await prisma.site.findMany({
    where: {
      OR: [
        { name: { equals: query, mode: 'insensitive' } },
        { slug: { equals: query.toLowerCase() } },
        { subdomain: { equals: query.toLowerCase() } },
      ],
    },
  });

  if (sites.length === 0) {
    console.log(`No site matched "${query}". Listing recent sites instead:`);
    const recent = await prisma.site.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, slug: true, subdomain: true, published: true, createdAt: true },
    });
    console.table(recent);
    return;
  }

  for (const site of sites) {
    console.log('\n=== SITE ===');
    console.log({
      id: site.id, name: site.name, slug: site.slug, subdomain: site.subdomain,
      published: site.published, lastPublishedAt: site.lastPublishedAt, createdAt: site.createdAt,
    });

    const assetCount = await prisma.siteAsset.count({ where: { siteId: site.id } });
    console.log(`Published SiteAssets (served bytes): ${assetCount}`);

    const sessions = await prisma.generationSession.findMany({
      where: { siteId: site.id },
      orderBy: { lastActiveAt: 'desc' },
    });
    console.log(`GenerationSessions: ${sessions.length}`);

    for (const s of sessions) {
      const files = fileList(s.fileCache);
      const real = files.filter((p) => p.startsWith('src/') && !TEMPLATE_ONLY.has(p));
      console.log(`\n  -- session ${s.id} --`);
      console.log({
        sandboxId: s.sandboxId,
        status: s.status,
        sandboxRuntimeStatus: s.sandboxRuntimeStatus,
        lastActiveAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
        fileCount: files.length,
        realSourceCount: real.length,
        hasRealSource: real.length > 0,
      });
      if (files.length) console.log('    files:', files.join(', '));
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
