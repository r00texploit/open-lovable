import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { fileCacheToFiles, realSourceCount } from '@/lib/sandbox/source-heuristics';

// GET /api/generation-session/[id] — fetch by sandboxId or record id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const genSession = await prisma.generationSession.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ id }, { sandboxId: id }],
    },
    include: { site: { select: { id: true, name: true, slug: true } } },
  });

  if (!genSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Reopening a site often lands on a newer session whose sandbox was reset to
  // the bare template, while the real source is stranded on an older sibling
  // session of the same site. If this session's own cache has no real source
  // but it belongs to a site, substitute the sibling session that holds the
  // most real source so the editor can restore the actual code.
  let fileCache = genSession.fileCache;
  let fileCacheSourceSandboxId: string | null = null;
  if (genSession.siteId && realSourceCount(fileCacheToFiles(fileCache)) === 0) {
    const siblings = await prisma.generationSession.findMany({
      where: { userId: session.user.id, siteId: genSession.siteId },
      orderBy: { lastActiveAt: 'desc' },
      select: { sandboxId: true, fileCache: true },
    });
    let best: { sandboxId: string; fileCache: unknown; count: number } | null = null;
    for (const s of siblings) {
      const count = realSourceCount(fileCacheToFiles(s.fileCache));
      if (count > 0 && (!best || count > best.count)) {
        best = { sandboxId: s.sandboxId, fileCache: s.fileCache, count };
      }
    }
    if (best) {
      fileCache = best.fileCache as typeof genSession.fileCache;
      fileCacheSourceSandboxId = best.sandboxId;
    }
  }

  return NextResponse.json({
    session: { ...genSession, fileCache },
    ...(fileCacheSourceSandboxId ? { fileCacheSourceSandboxId } : {}),
  });
}

// DELETE /api/generation-session/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.generationSession.findFirst({
    where: { userId: session.user.id, OR: [{ id }, { sandboxId: id }] },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.generationSession.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
