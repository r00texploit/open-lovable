import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

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
      aiModel: true,
      siteId: true,
      lastActiveAt: true,
      createdAt: true,
      site: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json({ sessions });
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
    aiModel,
    siteId,
  } = body;

  if (!sandboxId) {
    return NextResponse.json({ error: 'sandboxId is required' }, { status: 400 });
  }

  const data = {
    userId: session.user.id,
    sandboxProvider: sandboxProvider ?? 'vercel',
    sandboxUrl: sandboxUrl ?? null,
    chatMessages: chatMessages ?? [],
    conversationCtx: conversationCtx ?? null,
    aiModel: aiModel ?? null,
    siteId: siteId ?? null,
    lastActiveAt: new Date(),
  };

  const genSession = await prisma.generationSession.upsert({
    where: { sandboxId },
    create: { sandboxId, ...data },
    update: data,
  });

  return NextResponse.json({ session: genSession });
}
