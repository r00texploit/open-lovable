import { prisma } from '@/lib/db/prisma';
import { isSandboxActiveOnVps } from '@/lib/vps-deployments';

export async function reconcileUserVpsSandboxes(
  userId: string,
  excludeSandboxId?: string,
): Promise<number> {
  const sessions = await prisma.generationSession.findMany({
    where: {
      userId,
      status: { in: ['running', 'creating'] },
      ...(excludeSandboxId ? { sandboxId: { not: excludeSandboxId } } : {}),
    },
    select: { id: true, sandboxId: true, sandboxProvider: true },
  });

  const active = await Promise.all(sessions.map(async (session) => {
    if (session.sandboxProvider !== 'vps') return true;
    const running = await isSandboxActiveOnVps(session.sandboxId);
    if (!running) {
      await prisma.generationSession.update({
        where: { id: session.id },
        data: { status: 'terminated', sandboxRuntimeStatus: 'terminated' },
      });
    }
    return running;
  }));

  return active.filter(Boolean).length;
}

export async function enforceUserVpsSandboxLimit(
  userId: string,
  excludeSandboxId?: string,
  limit = 5,
): Promise<void> {
  const activeCount = await reconcileUserVpsSandboxes(userId, excludeSandboxId);
  if (activeCount >= limit) {
    const error = new Error(`Maximum number of concurrent sandboxes (${limit}) reached`) as Error & { status: number };
    error.status = 429;
    throw error;
  }
}
