import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

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

  return NextResponse.json({ session: genSession });
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
