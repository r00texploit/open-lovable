import { NextRequest, NextResponse } from 'next/server';
import { appConfig } from '@/config/app.config';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const sandboxId = body?.sandboxId || searchParams.get('sandboxId') || searchParams.get('sandbox');
    const resolved = await resolveRequestSandbox(sandboxId);

    if (!resolved.ok) {
      return resolved.response;
    }

    const extended = await resolved.value.provider.extendTimeout(appConfig.vercelSandbox.keepAliveIntervalMs);

    return NextResponse.json({
      success: true,
      extended,
      message: extended
        ? `Sandbox lifetime extended by ${appConfig.vercelSandbox.keepAliveIntervalMinutes} minutes`
        : 'Sandbox lifetime could not be extended (plan maximum reached or unsupported)'
    });

  } catch (error) {
    console.error('[extend-sandbox-timeout] Error:', error);
    return NextResponse.json({
      success: false,
      extended: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
