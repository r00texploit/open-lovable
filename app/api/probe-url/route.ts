import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSandboxWithUser } from '@/lib/session-store';
import { assertSafeSandboxProbeUrl } from '@/lib/security/sandbox-probe-url';

// Authenticated, ownership-scoped sandbox health probe. The server derives the
// URL from the session rather than accepting an arbitrary outbound URL.
export async function GET(request: NextRequest) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sandboxId = request.nextUrl.searchParams.get('sandboxId');
  if (!sandboxId) {
    return NextResponse.json({ error: 'sandboxId is required' }, { status: 400 });
  }
  const sandboxSession = await getSandboxWithUser(sandboxId, authSession.user.id);
  if (!sandboxSession) {
    return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 });
  }
  const storedUrl = sandboxSession.rawSandboxUrl || sandboxSession.sandboxUrl;
  if (!storedUrl) {
    return NextResponse.json({ status: 0, ok: false, error: 'Sandbox URL is unavailable' });
  }

  try {
    const url = await assertSafeSandboxProbeUrl(storedUrl, sandboxSession.sandboxProvider);
    const res = await fetch(url.toString(), {
      method: 'HEAD',
      signal: AbortSignal.timeout(6000),
      redirect: 'manual',
      cache: 'no-store',
    });
    return NextResponse.json({
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      stopped: res.status === 410,
      needsRecreation: [410, 502, 503].includes(res.status),
      code: res.status === 410 ? 'SANDBOX_STOPPED' : undefined,
    });
  } catch (err: unknown) {
    return NextResponse.json({ status: 0, ok: false, error: err instanceof Error ? err.message : 'Probe failed' });
  }
}
