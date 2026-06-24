import { NextResponse } from 'next/server';
import type { SandboxState } from '@/types/sandbox';
import { appConfig } from '@/config/app.config';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { createSession, getSession } from '@/lib/session-store';
import { requireUser } from '@/lib/auth/server';
import { SandboxFactory } from '@/lib/sandbox/factory';

// ponytail: global state kept for backward compat during migration
// Each user now gets their own session-scoped sandbox via sandboxManager
declare global {
  var activeSandbox: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

export async function POST(request: Request) {
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

  // Check if session already has active sandbox
  const existingProvider = sandboxManager.getProvider(session.sandboxId);
  if (existingProvider?.isAlive()) {
    const info = existingProvider.getSandboxInfo();
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sandboxId: session.sandboxId,
      url: info?.url || session.sandboxUrl,
    });
  }

  // Create new sandbox for this session
  try {
    const provider = await SandboxFactory.create();
    await provider.createSandbox();
    await provider.setupViteApp();

    const info = provider.getSandboxInfo();
    if (!info) {
      throw new Error('Failed to get sandbox info');
    }

    // Register with session-scoped manager
    sandboxManager.registerSandbox(session.sandboxId, provider);

    // Backward compat: set global for routes not yet migrated
    global.activeSandbox = provider;
    global.sandboxData = { sandboxId: session.sandboxId, url: info.url };
    if (!global.existingFiles) {
      global.existingFiles = new Set<string>();
    }
    global.existingFiles.clear();

    // Update session
    const { updateSession } = await import('@/lib/session-store');
    await updateSession(session.id, {
      sandboxUrl: info.url,
      status: 'running',
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sandboxId: session.sandboxId,
      url: info.url,
      message: 'Sandbox created and Vite React app initialized',
    });
  } catch (error) {
    console.error('[create-ai-sandbox] Failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create sandbox',
      },
      { status: 500 }
    );
  }
}
