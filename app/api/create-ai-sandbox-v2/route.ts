import { NextResponse } from 'next/server';
import { SandboxFactory } from '@/lib/sandbox/factory';
import type { SandboxState } from '@/types/sandbox';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { createSession, getSession } from '@/lib/session-store';
import { requireUser } from '@/lib/auth/server';

// ponytail: global state kept for backward compat
// Use session-scoped sandboxes via sandboxManager
declare global {
  var activeSandboxProvider: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const authResult = await requireUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = authResult;

    // Get or create session
    const sessionId = request.headers.get('x-session-id') || crypto.randomUUID();
    let session = await getSession(sessionId);

    if (!session) {
      session = await createSession(user.id, {
        sandboxId: `sb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        sandboxProvider: process.env.SANDBOX_PROVIDER || 'vercel',
      });
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
    
    // Also clean up legacy global state
    if (global.activeSandboxProvider) {
      try {
        await global.activeSandboxProvider.terminate();
      } catch (e) {
        console.error('Failed to terminate legacy global sandbox:', e);
      }
      global.activeSandboxProvider = null;
    }
    
    // Clear existing files tracking
    if (global.existingFiles) {
      global.existingFiles.clear();
    } else {
      global.existingFiles = new Set<string>();
    }

    // Create new sandbox using factory
    const provider = await SandboxFactory.create();
    const sandboxInfo = await provider.createSandbox();
    
    console.log('[create-ai-sandbox-v2] Setting up Vite React app...');
    await provider.setupViteApp();
    
    // Register with sandbox manager keyed by session
    sandboxManager.registerSandbox(session.sandboxId, provider);

    // Update session with sandbox URL
    const { updateSession } = await import('@/lib/session-store');
    await updateSession(session.id, {
      sandboxUrl: sandboxInfo.url,
      status: 'running',
    });

    // Also store in legacy global state for backward compatibility
    global.activeSandboxProvider = provider;
    global.sandboxData = {
      sandboxId: session.sandboxId,
      url: sandboxInfo.url
    };

    // Initialize sandbox state
    global.sandboxState = {
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
    };

    console.log(`[create-ai-sandbox-v2] Sandbox ready at: ${sandboxInfo.url} for session ${session.id}`);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sandboxId: session.sandboxId,
      url: sandboxInfo.url,
      provider: sandboxInfo.provider,
      message: 'Sandbox created and Vite React app initialized'
    });

  } catch (error) {
    console.error('[create-ai-sandbox-v2] Error:', error);
    
    // Clean up on error
    await sandboxManager.terminateAll();
    if (global.activeSandboxProvider) {
      try {
        await global.activeSandboxProvider.terminate();
      } catch (e) {
        console.error('Failed to terminate sandbox on error:', e);
      }
      global.activeSandboxProvider = null;
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create sandbox',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}