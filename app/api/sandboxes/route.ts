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
import { registerPreviewMapping, buildPreviewUrl, removePreviewMapping } from '@/lib/tenancy/preview-mapping';
import { prisma } from '@/lib/db/prisma';
import { buildPersistentSandboxName } from '@/lib/sandbox/persistent-sandbox';
import { enforceUserVpsSandboxLimit, reconcileUserVpsSandboxes } from '@/lib/sandbox/vps-session-reconciliation';

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

    await reconcileUserVpsSandboxes(session.user.id);
    const sandboxes = await getUserSandboxes(session.user.id);

    // Enhance with live status from sandbox manager
    const enhancedSandboxes = sandboxes.map(sb => {
      const provider = sandboxManager.getProvider(sb.sandboxId);
      return {
        ...sb,
        isActive: !!provider && provider.isAlive(),
        canReconnect: !provider && !!(sb.sandboxName || sb.rawSandboxUrl || sb.sandboxUrl),
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
    await enforceUserVpsSandboxLimit(session.user.id);

    // Create new sandbox session
    const sandboxId = `sb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const dbSession = await createSession(session.user.id, {
      sandboxId,
      sandboxProvider: process.env.SANDBOX_PROVIDER || 'vps',
      status: 'creating',
    });

    // Look up the associated site before creating the sandbox so we can assign
    // the subdomain directly on the VPS provider.
    let siteInfo: { slug: string; subdomain: string; userId: string } | null = null;
    if (dbSession.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: dbSession.siteId },
        select: { id: true, slug: true, subdomain: true, userId: true }
      });
      if (site) {
        siteInfo = site;
      }
    }

    // Create the actual sandbox
    const provider = await SandboxFactory.create();
    const sandboxName = buildPersistentSandboxName(dbSession.id, dbSession.siteId);
    const sandboxInfo = await provider.createSandbox({
      appSandboxId: sandboxId,
      sandboxName,
      setupOnCreate: true,
      subdomain: siteInfo?.subdomain,
    });

    // Register with sandbox manager for the user
    sandboxManager.registerSandboxForUser(session.user.id, sandboxId, provider);

    // Check if this sandbox is associated with a site for custom preview URL
    let previewUrl = sandboxInfo.url;
    let siteSlug: string | null = null;

    if (siteInfo) {
      siteSlug = siteInfo.slug;
      // Register preview mapping for the site subdomain
      registerPreviewMapping(
        siteInfo.subdomain,
        sandboxInfo.url,
        sandboxId,
        dbSession.siteId!,
        siteInfo.userId
      );
      // Use custom preview URL
      previewUrl = buildPreviewUrl(siteInfo.subdomain);
    }

    // Update session with sandbox URL
    const { updateSession } = await import('@/lib/session-store');
    await updateSession(dbSession.id, {
      sandboxUrl: previewUrl,
      rawSandboxUrl: sandboxInfo.url,
      sandboxName: sandboxInfo.sandboxName || sandboxName,
      sandboxRuntimeStatus: sandboxInfo.runtimeStatus || 'running',
      currentSnapshotId: sandboxInfo.currentSnapshotId || null,
      sandboxContainerId: sandboxInfo.containerId || null,
      sandboxHost: sandboxInfo.host ? `${sandboxInfo.host}:${sandboxInfo.port ?? ''}` : null,
      status: 'running',
    });

    return NextResponse.json({
      success: true,
      sandbox: {
        id: dbSession.id,
        sandboxId,
        url: sandboxInfo.url,
        previewUrl,
        sandboxName: sandboxInfo.sandboxName || sandboxName,
        siteSlug,
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
      { status: typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 500 }
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

        // Remove preview mapping if exists
        try {
          const { getSandboxWithUser } = await import('@/lib/session-store');
          const sandboxSession = await getSandboxWithUser(sandboxId, session.user.id);
          if (sandboxSession?.siteId) {
            const site = await prisma.site.findUnique({
              where: { id: sandboxSession.siteId },
              select: { subdomain: true }
            });
            if (site) {
              removePreviewMapping(site.subdomain);
            }
          }
        } catch (e) {
          console.warn(`[sandboxes] Failed to remove preview mapping for ${sandboxId}:`, e);
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
