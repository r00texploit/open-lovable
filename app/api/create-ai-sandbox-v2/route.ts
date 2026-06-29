import { NextResponse } from 'next/server';
import { SandboxFactory } from '@/lib/sandbox/factory';
import type { SandboxState } from '@/types/sandbox';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { createSession, getSession } from '@/lib/session-store';
import { requireUser } from '@/lib/auth/server';
import { setSandboxState, setSandboxProvider } from '@/lib/sandbox/sandbox-state';
import { registerPreviewMapping, buildPreviewUrl } from '@/lib/tenancy/preview-mapping';
import { prisma } from '@/lib/db/prisma';

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

    if (!session) {
      session = await createSession(user.id, {
        sandboxId: `sb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        sandboxProvider: process.env.SANDBOX_PROVIDER || 'vercel',
        siteId: requestBody.siteId || null,
      });
      console.log(`[create-ai-sandbox-v2] Created new session with siteId:`, requestBody.siteId || null);
    } else if (requestBody.siteId && !session.siteId) {
      // Update existing session with siteId if provided
      const { updateSession } = await import('@/lib/session-store');
      session = await updateSession(session.id, { siteId: requestBody.siteId });
      console.log(`[create-ai-sandbox-v2] Updated existing session with siteId:`, requestBody.siteId);
    }

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

    // Create new sandbox using factory
    const provider = await SandboxFactory.create();
    const sandboxInfo = await provider.createSandbox();
    
    console.log('[create-ai-sandbox-v2] Setting up Vite React app...');
    await provider.setupViteApp();
    
    // Register with sandbox manager keyed by session and user
    sandboxManager.registerSandboxForUser(user.id, session.sandboxId, provider);

    // Get site info for custom preview URL
    let previewUrl = sandboxInfo.url;
    let siteSlug: string | null = null;

    console.log(`[create-ai-sandbox-v2] Checking for site association. session.siteId:`, session.siteId);

    if (session.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: session.siteId },
        select: { id: true, slug: true, subdomain: true, userId: true }
      });

      console.log(`[create-ai-sandbox-v2] Found site:`, site ? { id: site.id, slug: site.slug, subdomain: site.subdomain } : null);

      if (site) {
        siteSlug = site.slug;
        // Register preview mapping for the site subdomain
        registerPreviewMapping(
          site.subdomain,
          sandboxInfo.url,
          session.sandboxId,
          site.id,
          site.userId
        );
        // Use custom preview URL
        previewUrl = buildPreviewUrl(site.subdomain);
        console.log(`[create-ai-sandbox-v2] Preview URL registered: ${site.subdomain} -> ${sandboxInfo.url}`);
        console.log(`[create-ai-sandbox-v2] Custom preview URL: ${previewUrl}`);
      } else {
        console.log(`[create-ai-sandbox-v2] Site not found for siteId:`, session.siteId);
      }
    } else {
      console.log(`[create-ai-sandbox-v2] No siteId associated with session`);
    }

    // Update session with sandbox URL
    const { updateSession } = await import('@/lib/session-store');
    await updateSession(session.id, {
      sandboxUrl: previewUrl,
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
        url: sandboxInfo.url
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
        error: error instanceof Error ? error.message : 'Failed to create sandbox',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
