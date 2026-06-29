import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSandboxWithUser, deleteSession, updateSession } from '@/lib/session-store';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sandboxes/[id]
 * Get details of a specific sandbox
 */
export async function GET(request: NextRequest, { params }: Params) {
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

    // Get live status from sandbox manager
    const provider = sandboxManager.getProvider(sandboxId);
    const isActive = !!provider && provider.isAlive();

    return NextResponse.json({
      success: true,
      sandbox: {
        ...sandboxSession,
        isActive,
        canReconnect: !isActive && !!sandboxSession.sandboxUrl,
      },
    });
  } catch (error) {
    console.error('[sandbox] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sandbox' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sandboxes/[id]
 * Update sandbox metadata
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sandboxId } = await params;
    const body = await request.json().catch(() => ({}));

    const sandboxSession = await getSandboxWithUser(sandboxId, session.user.id);
    if (!sandboxSession) {
      return NextResponse.json(
        { error: 'Sandbox not found or access denied' },
        { status: 404 }
      );
    }

    // Update session metadata
    const updates: any = {};
    if (body.name) updates.name = body.name;
    if (body.conversationCtx) updates.conversationCtx = body.conversationCtx;
    if (body.chatMessages) updates.chatMessages = body.chatMessages;

    await updateSession(sandboxSession.id, updates);

    return NextResponse.json({
      success: true,
      message: 'Sandbox updated successfully',
    });
  } catch (error) {
    console.error('[sandbox] PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update sandbox' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sandboxes/[id]
 * Delete a specific sandbox
 */
export async function DELETE(request: NextRequest, { params }: Params) {
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

    // Terminate the sandbox if it's running
    try {
      await sandboxManager.terminateSandbox(sandboxId);
    } catch (e) {
      console.warn(`[sandbox] Failed to terminate sandbox ${sandboxId}:`, e);
    }

    // Delete the session from database
    await deleteSession(sandboxSession.id);

    return NextResponse.json({
      success: true,
      message: 'Sandbox deleted successfully',
    });
  } catch (error) {
    console.error('[sandbox] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete sandbox' },
      { status: 500 }
    );
  }
}
