import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { deleteSandboxState } from '@/lib/sandbox/sandbox-state';

/**
 * Kill a sandbox by its GenerationSession id (admin). Terminates the
 * underlying sandbox via the shared sandbox-manager and marks the session
 * killed — the same path the user-facing /api/kill-sandbox route uses, but
 * resolved directly by id rather than the caller's current sandbox.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const session = await prisma.generationSession.findUnique({
    where: { id },
    select: { id: true, sandboxId: true, status: true },
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  let killed = false;
  try {
    await sandboxManager.terminateSandbox(session.sandboxId);
    deleteSandboxState(session.sandboxId);
    killed = true;
  } catch (e) {
    console.error('[admin/kill-sandbox] terminate failed:', e);
  }

  await prisma.generationSession.update({
    where: { id: session.id },
    data: { status: 'killed' },
  });

  return NextResponse.json({ ok: true, sandboxKilled: killed });
}