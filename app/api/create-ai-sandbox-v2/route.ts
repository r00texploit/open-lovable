import { NextResponse } from 'next/server';
import { SandboxFactory } from '@/lib/sandbox/factory';
import type { SandboxState } from '@/types/sandbox';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { createSession, getSession } from '@/lib/session-store';
import { requireUser } from '@/lib/auth/server';
import { setSandboxState, setSandboxProvider } from '@/lib/sandbox/sandbox-state';
import { registerPreviewMapping, buildPreviewUrl } from '@/lib/tenancy/preview-mapping';
import { prisma } from '@/lib/db/prisma';
import { buildPersistentSandboxName } from '@/lib/sandbox/persistent-sandbox';
import { enforceUserVpsSandboxLimit } from '@/lib/sandbox/vps-session-reconciliation';

// ponytail: global state kept for backward compat
// Use session-scoped sandboxes via sandboxManager
declare global {
  var activeSandboxProvider: any;
  var activeSandbox: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

export async function POST(request: Request) {
  // Get authenticated user first (outside try for error handling)
  const authResult = await requireUser();
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { user } = authResult;

  // Get or create session
  const sessionId = request.headers.get('x-session-id') || crypto.randomUUID();
  let session = await getSession(sessionId);

  if (session && session.userId !== user.id) {
    return NextResponse.json({ error: 'Sandbox session not found' }, { status: 404 });
  }

  try {
    // Parse request body to get optional siteId
    let requestBody: { siteId?: string } = {};
    try {
      requestBody = await request.json();
    } catch {
      // No body or invalid JSON, continue with empty object
    }

    console.log(`[create-ai-sandbox-v2] Request body:`, requestBody);
    console.log(`[create-ai-sandbox-v2] Session exists:`, !!session, session?.siteId ? `with siteId: ${session.siteId}` : 'without siteId');

    let validSiteId: string | null = null;
    if (requestBody.siteId) {
      const ownedSite = await prisma.site.findFirst({
        where: { id: requestBody.siteId, userId: user.id },
        select: { id: true },
      });
      validSiteId = ownedSite?.id ?? null;
    }

    if (!session) {
      await enforceUserVpsSandboxLimit(user.id);
      session = await createSession(user.id, {
        sandboxId: `sb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        sandboxProvider: process.env.SANDBOX_PROVIDER || 'vps',
        siteId: validSiteId,
      });
      console.log(`[create-ai-sandbox-v2] Created new session with siteId:`, validSiteId);
    } else if (validSiteId && !session.siteId) {
      // Update existing session with siteId if provided
      const { updateSession } = await import('@/lib/session-store');
      session = await updateSession(session.id, { siteId: validSiteId });
      console.log(`[create-ai-sandbox-v2] Updated existing session with siteId:`, validSiteId);
    }

    if (!session) {
      return NextResponse.json({ error: 'Failed to create or retrieve session' }, { status: 500 });
    }

    await enforceUserVpsSandboxLimit(user.id, session.sandboxId);

    console.log(`[create-ai-sandbox-v2] Creating sandbox for session ${session.id}...`);

    // Only terminate this session's existing sandbox, not all sandboxes
    const existingProvider = sandboxManager.getProvider(session.sandboxId);
    if (existingProvider) {
      console.log(`[create-ai-sandbox-v2] Cleaning up existing sandbox for session ${session.id}`);
      try {
        await existingProvider.terminate();
      } catch (e) {
        console.error('Failed to terminate existing sandbox:', e);
      }
    }
    
    // Clean up sandbox-scoped state for this session's previous sandbox
    if (session.sandboxId) {
      const { deleteSandboxState } = await import('@/lib/sandbox/sandbox-state');
      deleteSandboxState(session.sandboxId);
    }

    // Get site info before creating the sandbox so we can assign a subdomain
    let siteSlug: string | null = null;
    let siteSubdomain: string | undefined;
    let siteUserId: string | null = null;

    console.log(`[create-ai-sandbox-v2] Checking for site association. session.siteId:`, session.siteId);

    if (session.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: session.siteId },
        select: { id: true, slug: true, subdomain: true, userId: true }
      });

      console.log(`[create-ai-sandbox-v2] Found site:`, site ? { id: site.id, slug: site.slug, subdomain: site.subdomain } : null);

      if (site) {
        siteSlug = site.slug;
        siteSubdomain = site.subdomain;
        siteUserId = site.userId;
      } else {
        console.log(`[create-ai-sandbox-v2] Site not found for siteId:`, session.siteId);
      }
    } else {
      console.log(`[create-ai-sandbox-v2] No siteId associated with session`);
    }

    // Create new sandbox using factory
    const provider = await SandboxFactory.create();
    const sandboxName = buildPersistentSandboxName(session.id, session.siteId);
    const sandboxInfo = await provider.createSandbox({
      appSandboxId: session.sandboxId,
      sandboxName,
      setupOnCreate: true,
      subdomain: siteSubdomain,
    });

    // Register with sandbox manager keyed by session and user
    sandboxManager.registerSandboxForUser(user.id, session.sandboxId, provider);

    // Get site info for custom preview URL
    let previewUrl = sandboxInfo.url;

    if (siteSubdomain && siteUserId) {
      registerPreviewMapping(
        siteSubdomain,
        sandboxInfo.url,
        session.sandboxId,
        session.siteId!,
        siteUserId
      );
      previewUrl = buildPreviewUrl(siteSubdomain);
      console.log(`[create-ai-sandbox-v2] Preview URL registered: ${siteSubdomain} -> ${sandboxInfo.url}`);
      console.log(`[create-ai-sandbox-v2] Custom preview URL: ${previewUrl}`);
    }

    // Update session with sandbox URL
    const { updateSession } = await import('@/lib/session-store');
    await updateSession(session.id, {
      sandboxUrl: previewUrl,
      rawSandboxUrl: sandboxInfo.url,
      sandboxName: sandboxInfo.sandboxName || sandboxName,
      sandboxRuntimeStatus: sandboxInfo.runtimeStatus || 'running',
      currentSnapshotId: sandboxInfo.currentSnapshotId || null,
      sandboxContainerId: sandboxInfo.containerId || null,
      sandboxHost: sandboxInfo.host ? `${sandboxInfo.host}:${sandboxInfo.port ?? ''}` : null,
      status: 'running',
    });

    // Store in sandbox-scoped state for multi-sandbox support
    setSandboxProvider(session.sandboxId, provider);

    // Initialize sandbox state
    setSandboxState(session.sandboxId, {
      fileCache: {
        files: {},
        lastSync: Date.now(),
        sandboxId: session.sandboxId
      },
      sandbox: provider,
      sandboxData: {
        sandboxId: session.sandboxId,
        url: sandboxInfo.url,
        previewUrl,
        sandboxName: sandboxInfo.sandboxName || sandboxName,
      }
    });

    console.log(`[create-ai-sandbox-v2] Sandbox ready at: ${sandboxInfo.url} for session ${session.id}`);
    console.log(`[create-ai-sandbox-v2] Preview URL: ${previewUrl}`);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sandboxId: session.sandboxId,
      url: sandboxInfo.url,
      previewUrl: previewUrl,
      sandboxName: sandboxInfo.sandboxName || sandboxName,
      siteSlug: siteSlug,
      provider: sandboxInfo.provider,
      message: 'Sandbox created and Vite React app initialized'
    });

  } catch (error) {
    console.error('[create-ai-sandbox-v2] Error:', error);

    // Clean up on error - terminate user's sandboxes
    await sandboxManager.terminateUserSandboxes(user.id);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create sandbox'
      },
      { status: typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 500 }
    );
  }
}
