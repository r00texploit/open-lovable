import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { buildPreviewUrl } from '@/lib/tenancy/preview-mapping';

// GET /api/generation-session — list user's recent sessions.
// With ?siteId= returns the single best session for that site instead:
// the most recent one that actually has generated files, so "Edit site"
// restores real code rather than whichever blank sandbox was touched last.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = request.nextUrl.searchParams.get('siteId');
  if (siteId) {
    const siteSessions = await prisma.generationSession.findMany({
      where: { userId: session.user.id, siteId },
      orderBy: { lastActiveAt: 'desc' },
      take: 10,
    });

    const hasFiles = (s: (typeof siteSessions)[number]) => {
      const cache = s.fileCache as { files?: Record<string, unknown> } | Record<string, unknown> | null;
      const files = (cache && typeof cache === 'object' && 'files' in cache ? (cache as any).files : cache) || {};
      return Object.keys(files).length > 0;
    };

    const best = siteSessions.find(hasFiles) ?? siteSessions[0] ?? null;
    return NextResponse.json({ session: best });
  }

  const sessions = await prisma.generationSession.findMany({
    where: { userId: session.user.id },
    orderBy: { lastActiveAt: 'desc' },
    take: 20,
    select: {
      id: true,
      sandboxId: true,
      sandboxProvider: true,
      sandboxUrl: true,
      rawSandboxUrl: true,
      sandboxName: true,
      sandboxRuntimeStatus: true,
      currentSnapshotId: true,
      chatMessages: true,
      conversationCtx: true,
      fileCache: true,
      aiModel: true,
      siteId: true,
      lastActiveAt: true,
      createdAt: true,
      site: { select: { id: true, name: true, slug: true, subdomain: true } },
    },
  });

  const transformedSessions = sessions.map(s => {
    if (s.site?.subdomain) {
      const customUrl = buildPreviewUrl(s.site.subdomain);
      return {
        ...s,
        sandboxUrl: customUrl,
        previewUrl: customUrl,
        rawSandboxUrl: s.rawSandboxUrl || s.sandboxUrl,
      };
    }
    return {
      ...s,
      previewUrl: s.sandboxUrl,
      rawSandboxUrl: s.rawSandboxUrl || s.sandboxUrl,
    };
  });

  return NextResponse.json({ sessions: transformedSessions });
}

// POST /api/generation-session — create or update session by sandboxId
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    sandboxId,
    sandboxProvider,
    sandboxUrl,
    rawSandboxUrl,
    sandboxName,
    sandboxRuntimeStatus,
    currentSnapshotId,
    chatMessages,
    conversationCtx,
    fileCache,
    homeUrlInput,
    homeContextInput,
    aiModel,
    siteId,
  } = body;

  if (!sandboxId) {
    return NextResponse.json({ error: 'sandboxId is required' }, { status: 400 });
  }

  // Only attach a siteId that actually exists and belongs to this user.
  // A stale id (e.g. from localStorage after the site was deleted) would
  // otherwise trip the GenerationSession_siteId_fkey foreign key constraint.
  let validSiteId: string | null = null;
  if (siteId) {
    const ownedSite = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });
    validSiteId = ownedSite?.id ?? null;
  }

  const data = {
    userId: session.user.id,
    sandboxProvider: sandboxProvider ?? 'vercel',
    sandboxUrl: sandboxUrl ?? null,
    rawSandboxUrl: rawSandboxUrl ?? sandboxUrl ?? null,
    sandboxName: sandboxName ?? null,
    sandboxRuntimeStatus: sandboxRuntimeStatus ?? null,
    currentSnapshotId: currentSnapshotId ?? null,
    chatMessages: chatMessages ?? [],
    conversationCtx: {
      ...(conversationCtx ?? {}),
      homeUrlInput: homeUrlInput ?? (conversationCtx as any)?.homeUrlInput,
      homeContextInput: homeContextInput ?? (conversationCtx as any)?.homeContextInput,
    },
    fileCache: fileCache ?? {},
    aiModel: aiModel ?? null,
    siteId: validSiteId,
    lastActiveAt: new Date(),
  };

  const existingSession = await prisma.generationSession.findUnique({
    where: { sandboxId },
    select: { id: true, userId: true },
  });

  if (existingSession && existingSession.userId !== session.user.id) {
    return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 });
  }

  const genSession = existingSession
    ? await prisma.generationSession.update({
        where: { id: existingSession.id },
        data,
      })
    : await prisma.generationSession.create({
        data: { sandboxId, ...data },
      });

  return NextResponse.json({ session: genSession });
}

// PATCH /api/generation-session — update siteId for a specific user-owned session
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { siteId, sandboxId } = body;

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  if (!sandboxId || typeof sandboxId !== 'string') {
    return NextResponse.json({ error: 'sandboxId is required' }, { status: 400 });
  }

  // Verify the site belongs to this user
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: session.user.id },
    select: { id: true, slug: true, subdomain: true },
  });

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const genSession = await prisma.generationSession.findFirst({
    where: { sandboxId, userId: session.user.id },
  });

  if (!genSession) {
    return NextResponse.json({ error: 'Sandbox session not found' }, { status: 404 });
  }

  const rawSandboxUrl = genSession.rawSandboxUrl || genSession.sandboxUrl;
  const previewUrl = buildPreviewUrl(site.subdomain);

  // Update the session with the siteId and durable URL split:
  // sandboxUrl is what users open; rawSandboxUrl is what proxy/resume uses.
  const updatedSession = await prisma.generationSession.update({
    where: { id: genSession.id },
    data: {
      siteId: site.id,
      sandboxUrl: previewUrl,
      rawSandboxUrl,
      lastActiveAt: new Date(),
    },
  });

  // Keep local dev fallback mapping in sync; durable routing uses rawSandboxUrl.
  if (rawSandboxUrl) {
    const { registerPreviewMapping } = await import('@/lib/tenancy/preview-mapping');
    registerPreviewMapping(
      site.subdomain,
      rawSandboxUrl,
      genSession.sandboxId,
      site.id,
      session.user.id
    );
    console.log('[PATCH generation-session] Registered preview mapping for subdomain:', site.subdomain);
  }

  return NextResponse.json({ session: updatedSession });
}
