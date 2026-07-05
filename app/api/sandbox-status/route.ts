import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { buildPreviewUrl } from '@/lib/tenancy/preview-mapping';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

/**
 * Check if the sandbox URL is actually responding.
 * Vercel returns 410/SANDBOX_STOPPED when a sandbox session was stopped or its
 * configured timeout expired. Treat it the same as a dead preview so the client
 * can recreate the sandbox instead of embedding Vercel's error page.
 */
async function checkSandboxHealth(url: string | null): Promise<{ healthy: boolean; statusCode?: number; error?: string; stopped?: boolean }> {
  if (!url) {
    return { healthy: false, error: 'No sandbox URL provided' };
  }

  try {
    // Attempt to fetch the sandbox URL with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      // Don't follow redirects, just check if the server is responding
      redirect: 'manual'
    });

    clearTimeout(timeoutId);

    if (response.status === 410) {
      return {
        healthy: false,
        statusCode: 410,
        stopped: true,
        error: 'Sandbox was stopped and is no longer reachable'
      };
    }

    // 502 indicates the sandbox is not listening (timed out or crashed)
    if (response.status === 502 || response.status === 503) {
      return {
        healthy: false,
        statusCode: response.status,
        error: 'Sandbox not listening on port (timed out or crashed)'
      };
    }

    // Any response means the server is up (even 404, 500, etc.)
    // The important thing is the Vite server is running
    return { healthy: true, statusCode: response.status };

  } catch (error: any) {
    // Network errors, timeouts, etc. indicate the sandbox is unreachable
    if (error.name === 'AbortError') {
      return { healthy: false, error: 'Connection timeout' };
    }
    return { healthy: false, error: error.message };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkHealth = searchParams.get('checkHealth') === 'true'; // Enable actual health check
    const sandboxId = searchParams.get('sandboxId') || searchParams.get('sandbox');

    const resolved = await resolveRequestSandbox(sandboxId);
    if (!resolved.ok) {
      return resolved.response;
    }

    let sandboxHealthy = false;
    let sandboxInfo: any = null;
    let needsRecreation = false;
    let healthDetails = null;

    const { provider, session: sandboxSession, userId } = resolved.value;

    try {
      // Check if sandbox is healthy by getting its info
      const providerInfo = provider.getSandboxInfo();

      sandboxInfo = {
        sandboxId: sandboxSession?.sandboxId || resolved.value.sandboxId,
        url: providerInfo?.url || sandboxSession?.rawSandboxUrl || sandboxSession?.sandboxUrl,
        previewUrl: sandboxSession?.sandboxUrl || undefined,
        sandboxName: sandboxSession?.sandboxName || providerInfo?.sandboxName,
        runtimeStatus: providerInfo?.runtimeStatus || sandboxSession?.sandboxRuntimeStatus,
        filesTracked: Array.isArray(sandboxSession?.existingFiles)
          ? sandboxSession.existingFiles
          : [],
        lastHealthCheck: new Date().toISOString()
      };

      // Check if this sandbox has an associated site for preview URL
      const genSession = await prisma.generationSession.findFirst({
        where: { sandboxId: sandboxInfo.sandboxId, userId },
        include: { site: { select: { subdomain: true } } },
      });

      if (genSession?.site?.subdomain) {
        sandboxInfo.previewUrl = buildPreviewUrl(genSession.site.subdomain);
      }

      // Perform actual health check if requested
      if (checkHealth && sandboxInfo.url) {
        healthDetails = await checkSandboxHealth(sandboxInfo.url);
        sandboxHealthy = healthDetails.healthy;

        // If Vercel says the sandbox stopped, or the port is gone, recreate.
        if ([410, 502, 503].includes(healthDetails.statusCode ?? 0)) {
          needsRecreation = true;
          console.log(`[sandbox-status] Sandbox returned ${healthDetails.statusCode}, needs recreation`);
        }
      } else {
        // Basic health check - just verify provider has info
        sandboxHealthy = !!providerInfo;
      }
    } catch (error) {
      console.error('[sandbox-status] Health check failed:', error);
      sandboxHealthy = false;
    }

    return NextResponse.json({
      success: true,
      active: true,
      healthy: sandboxHealthy,
      needsRecreation,
      sandboxData: sandboxInfo,
      healthDetails,
      message: needsRecreation
        ? 'Sandbox stopped or timed out and needs to be recreated'
        : sandboxHealthy
          ? 'Sandbox is active and healthy'
          : 'Sandbox exists but is not responding'
    });

  } catch (error) {
    console.error('[sandbox-status] Error:', error);
    return NextResponse.json({
      success: false,
      active: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
