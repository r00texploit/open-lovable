import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import {
  getUserSandboxes,
  createSession,
  getSession,
  deleteSession
} from '@/lib/session-store';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { SandboxFactory } from '@/lib/sandbox/factory';

/**
 * GET /api/sandboxes
 * List all sandboxes for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sandboxes = await getUserSandboxes(session.user.id);

    // Enhance with live status from sandbox manager
    const enhancedSandboxes = sandboxes.map(sb => {
      const provider = sandboxManager.getProvider(sb.sandboxId);
      return {
        ...sb,
        isActive: !!provider && provider.isAlive(),
        canReconnect: !provider && !!sb.sandboxUrl,
      };
    });

    return NextResponse.json({
      success: true,
      sandboxes: enhancedSandboxes,
    });
  } catch (error) {
    console.error('[sandboxes] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sandboxes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sandboxes
 * Create a new sandbox for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      name = 'New Sandbox',
      template = 'vite-react',
      sessionId: existingSessionId
    } = body;

    // Check if user already has too many active sandboxes (limit to 5 concurrent)
    const existingSandboxes = await getUserSandboxes(session.user.id);
    const activeCount = existingSandboxes.filter(sb => sb.status === 'running').length;

    if (activeCount >= 5) {
      return NextResponse.json(
        {
          error: 'Maximum number of concurrent sandboxes (5) reached. Please delete an existing sandbox before creating a new one.',
          code: 'SANDBOX_LIMIT_REACHED'
        },
        { status: 429 }
      );
    }

    // Create new sandbox session
    const sandboxId = `sb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const dbSession = await createSession(session.user.id, {
      sandboxId,
      sandboxProvider: process.env.SANDBOX_PROVIDER || 'vercel',
      status: 'creating',
    });

    // Create the actual sandbox
    const provider = await SandboxFactory.create();
    const sandboxInfo = await provider.createSandbox();

    // Setup the Vite app
    await provider.setupViteApp();

    // Register with sandbox manager for the user
    sandboxManager.registerSandboxForUser(session.user.id, sandboxId, provider);

    // Update session with sandbox URL
    const { updateSession } = await import('@/lib/session-store');
    await updateSession(dbSession.id, {
      sandboxUrl: sandboxInfo.url,
      status: 'running',
    });

    return NextResponse.json({
      success: true,
      sandbox: {
        id: dbSession.id,
        sandboxId,
        url: sandboxInfo.url,
        provider: sandboxInfo.provider,
        status: 'running',
        name,
        template,
        createdAt: dbSession.createdAt,
      },
      message: 'Sandbox created successfully',
    });
  } catch (error) {
    console.error('[sandboxes] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sandbox' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sandboxes
 * Bulk delete sandboxes for the authenticated user
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { sandboxIds } = body;

    if (!Array.isArray(sandboxIds) || sandboxIds.length === 0) {
      return NextResponse.json(
        { error: 'sandboxIds array is required' },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      sandboxIds.map(async (sandboxId) => {
        // Verify the sandbox belongs to this user
        const { getSandboxWithUser } = await import('@/lib/session-store');
        const sandboxSession = await getSandboxWithUser(sandboxId, session.user.id);

        if (!sandboxSession) {
          return { sandboxId, success: false, error: 'Not found or access denied' };
        }

        // Terminate the sandbox if it's running
        try {
          await sandboxManager.terminateSandbox(sandboxId);
        } catch (e) {
          console.warn(`[sandboxes] Failed to terminate sandbox ${sandboxId}:`, e);
        }

        // Delete the session
        await deleteSession(sandboxSession.id);

        return { sandboxId, success: true };
      })
    );

    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(r => r.success);

    const failed = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(r => !r.success);

    return NextResponse.json({
      success: true,
      results: {
        deleted: succeeded.length,
        failed: failed.length,
        details: [...succeeded, ...failed],
      },
    });
  } catch (error) {
    console.error('[sandboxes] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete sandboxes' },
      { status: 500 }
    );
  }
}
