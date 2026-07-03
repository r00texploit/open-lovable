import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSandboxWithUser } from '@/lib/session-store';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/sandboxes/[id]/switch
 * Switch to a specific sandbox (make it the active one)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sandboxId } = await params;

    const sandboxSession = await getSandboxWithUser(sandboxId, session.user.id);
    if (!sandboxSession) {
      return NextResponse.json(
        { error: 'Sandbox not found or access denied' },
        { status: 404 }
      );
    }

    // Check if sandbox is already active in manager
    let provider = sandboxManager.getProvider(sandboxId);

    if (provider && provider.isAlive()) {
      // Sandbox is already running, just set it as active
      sandboxManager.setActiveSandbox(sandboxId);
    } else {
      // Try to reconnect/resume existing persistent sandbox
      console.log(`[switch] Attempting to reconnect to sandbox ${sandboxId}`);
      try {
        provider = await sandboxManager.getOrCreateProvider(sandboxId, sandboxSession);
        if (typeof (provider as any).ensureViteServerReady === 'function') {
          await (provider as any).ensureViteServerReady();
        }

        const sandboxInfo = provider.getSandboxInfo();
        if (sandboxInfo) {
          const { updateSession } = await import('@/lib/session-store');
          await updateSession(sandboxSession.id, {
            rawSandboxUrl: sandboxInfo.url,
            sandboxUrl: sandboxSession.sandboxUrl || sandboxInfo.url,
            sandboxName: sandboxInfo.sandboxName || sandboxSession.sandboxName,
            sandboxRuntimeStatus: sandboxInfo.runtimeStatus || 'running',
            currentSnapshotId: sandboxInfo.currentSnapshotId || null,
            status: 'running',
          });
        }
      } catch (error) {
        console.error(`[switch] Failed to reconnect to sandbox ${sandboxId}:`, error);
        return NextResponse.json(
          {
            error: 'Failed to reconnect to sandbox. The sandbox may have expired.',
            code: 'RECONNECT_FAILED',
          },
          { status: 500 }
        );
      }
    }

    // Set as active sandbox
    sandboxManager.setActiveSandbox(sandboxId);

    const sandboxInfo = provider.getSandboxInfo();

    return NextResponse.json({
      success: true,
      message: 'Switched to sandbox successfully',
      sandbox: {
        sandboxId,
        url: sandboxInfo?.url,
        provider: sandboxInfo?.provider,
      },
    });
  } catch (error) {
    console.error('[switch] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to switch sandbox' },
      { status: 500 }
    );
  }
}
