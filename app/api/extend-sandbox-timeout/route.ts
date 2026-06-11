import { NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import { appConfig } from '@/config/app.config';

declare global {
  var activeSandboxProvider: any;
}

export async function POST() {
  try {
    const provider = sandboxManager.getActiveProvider() || global.activeSandboxProvider;

    if (!provider) {
      return NextResponse.json({
        success: false,
        extended: false,
        error: 'No active sandbox'
      }, { status: 404 });
    }

    const extended = await provider.extendTimeout(appConfig.vercelSandbox.keepAliveIntervalMs);

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
