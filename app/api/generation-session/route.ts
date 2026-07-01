import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { buildPreviewUrl, getSandboxUrlForSubdomain } from '@/lib/tenancy/preview-mapping';

// GET /api/generation-session — list user's recent sessions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Transform sessions to use custom preview URL if site is associated
  const transformedSessions = sessions.map(s => {
    console.log('[generation-session] Processing session:', {
      sessionId: s.id,
      sandboxId: s.sandboxId,
      siteId: s.siteId,
      siteSubdomain: s.site?.subdomain,
      originalSandboxUrl: s.sandboxUrl,
    });

    if (s.site?.subdomain) {
      // Check if there's an active preview mapping
      const sandboxUrlFromMapping = getSandboxUrlForSubdomain(s.site.subdomain);
      console.log('[generation-session] Preview mapping check:', {
        subdomain: s.site.subdomain,
        hasMapping: !!sandboxUrlFromMapping,
        mappedUrl: sandboxUrlFromMapping,
      });

      if (sandboxUrlFromMapping) {
        const customUrl = buildPreviewUrl(s.site.subdomain);
        console.log('[generation-session] Returning custom URL:', customUrl);
        return {
          ...s,
          sandboxUrl: customUrl,
          previewUrl: customUrl,
        };
      } else {
        console.log('[generation-session] No preview mapping found, returning original URL:', s.sandboxUrl);
      }
    } else {
      console.log('[generation-session] No site or subdomain associated');
    }
    return s;
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

  // Update the session with the siteId
  const updatedSession = await prisma.generationSession.update({
    where: { id: genSession.id },
    data: { siteId: site.id, lastActiveAt: new Date() },
  });

  // Register preview mapping if sandboxUrl exists
  if (genSession.sandboxUrl) {
    const { registerPreviewMapping } = await import('@/lib/tenancy/preview-mapping');
    registerPreviewMapping(
      site.subdomain,
      genSession.sandboxUrl,
      genSession.sandboxId,
      site.id,
      session.user.id
    );
    console.log('[PATCH generation-session] Registered preview mapping for subdomain:', site.subdomain);
  }

  return NextResponse.json({ session: updatedSession });
}
