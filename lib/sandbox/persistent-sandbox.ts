import { prisma } from '@/lib/db/prisma';
import { SandboxFactory } from '@/lib/sandbox/factory';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { setSandboxProvider } from '@/lib/sandbox/sandbox-state';
import type { SandboxInfo, SandboxProvider } from '@/lib/sandbox/types';

export function buildPersistentSandboxName(sessionId: string, siteId?: string | null) {
  return siteId ? `site-${siteId}-session-${sessionId}` : `session-${sessionId}`;
}

export async function persistSandboxRuntime(
  sessionId: string,
  info: SandboxInfo,
  previewUrl?: string | null
) {
  return prisma.generationSession.update({
    where: { id: sessionId },
    data: {
      sandboxUrl: previewUrl || info.url,
      rawSandboxUrl: info.url,
      sandboxName: info.sandboxName || null,
      sandboxRuntimeStatus: info.runtimeStatus || 'running',
      currentSnapshotId: info.currentSnapshotId || null,
      sandboxContainerId: info.containerId || null,
      sandboxHost: info.host ? `${info.host}:${info.port ?? ''}` : null,
      status: 'running',
      lastActiveAt: new Date(),
    },
  });
}

export async function ensureSessionSandboxRunning(session: {
  id: string;
  sandboxId: string;
  sandboxProvider: string;
  sandboxName: string | null;
  siteId: string | null;
}): Promise<{ provider: SandboxProvider; info: SandboxInfo }> {
  let provider = sandboxManager.getProvider(session.sandboxId);

  if (!provider) {
    provider = await SandboxFactory.create(session.sandboxProvider || 'vercel');
    const sandboxName = session.sandboxName || buildPersistentSandboxName(session.id, session.siteId);
    if (typeof (provider as any).reconnect === 'function') {
      await (provider as any).reconnect(sandboxName, session.sandboxId);
    } else {
      await provider.createSandbox({
        appSandboxId: session.sandboxId,
        sandboxName,
        setupOnCreate: true,
      });
    }
    sandboxManager.registerSandbox(session.sandboxId, provider);
    setSandboxProvider(session.sandboxId, provider);
  }

  if (typeof (provider as any).ensureViteServerReady === 'function') {
    await (provider as any).ensureViteServerReady();
  }

  const info = provider.getSandboxInfo();
  if (!info) {
    throw new Error('Sandbox resumed but did not expose runtime info');
  }

  return { provider, info };
}
