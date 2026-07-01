import { NextRequest, NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { deleteSandboxState } from '@/lib/sandbox/sandbox-state';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sandboxId = body?.sandboxId;
    const resolved = await resolveRequestSandbox(sandboxId);

    if (!resolved.ok) {
      return resolved.response;
    }

    console.log('[kill-sandbox] Stopping sandbox:', resolved.value.sandboxId);

    let sandboxKilled = false;

    try {
      await sandboxManager.terminateSandbox(resolved.value.sandboxId);
      deleteSandboxState(resolved.value.sandboxId);
      sandboxKilled = true;
      console.log('[kill-sandbox] Sandbox stopped successfully');
    } catch (e) {
      console.error('[kill-sandbox] Failed to stop sandbox:', e);
    }

    return NextResponse.json({
      success: true,
      sandboxKilled,
      message: 'Sandbox cleaned up successfully'
    });
    
  } catch (error) {
    console.error('[kill-sandbox] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      }, 
      { status: 500 }
    );
  }
}
