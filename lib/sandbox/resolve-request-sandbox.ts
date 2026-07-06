import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSandboxWithUser } from '@/lib/session-store';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { getSandboxProvider } from '@/lib/sandbox/sandbox-state';
import type { SandboxProvider } from '@/lib/sandbox/types';

export type ResolvedRequestSandbox = {
  sandboxId: string;
  userId: string;
  provider: SandboxProvider;
  session: Awaited<ReturnType<typeof getSandboxWithUser>>;
};

export type SandboxResolution =
  | { ok: true; value: ResolvedRequestSandbox }
  | { ok: false; response: NextResponse };

export async function resolveRequestSandbox(
  sandboxId: unknown
): Promise<SandboxResolution> {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (typeof sandboxId !== 'string' || !sandboxId.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'sandboxId is required' }, { status: 400 }),
    };
  }

  const normalizedSandboxId = sandboxId.trim();
  const sandboxSession = await getSandboxWithUser(normalizedSandboxId, authSession.user.id);
  if (!sandboxSession) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Sandbox not found' }, { status: 404 }),
    };
  }

  let provider =
    sandboxManager.getProvider(normalizedSandboxId) ||
    getSandboxProvider(normalizedSandboxId);

  if (!provider) {
    try {
      provider = await sandboxManager.getOrCreateProvider(normalizedSandboxId, sandboxSession || undefined);
    } catch (error) {
      console.warn(
        `[resolve-request-sandbox] Failed to reconnect sandbox ${normalizedSandboxId}:`,
        error
      );
    }
  }

  if (!provider) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Sandbox provider not available' }, { status: 404 }),
    };
  }

  return {
    ok: true,
    value: {
      sandboxId: normalizedSandboxId,
      userId: authSession.user.id,
      provider,
      session: sandboxSession,
    },
  };
}
