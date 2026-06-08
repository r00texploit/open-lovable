import { NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import type { SandboxProvider } from '@/lib/sandbox/types';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sandboxId } = body as { sandboxId?: string };

    let provider: SandboxProvider | null = null;

    if (sandboxId) {
      provider = sandboxManager.getProvider(sandboxId);
      if (!provider) {
        try {
          provider = await sandboxManager.getOrCreateProvider(sandboxId);
        } catch {
          // fall through to active provider
        }
      }
    }

    if (!provider) {
      provider = sandboxManager.getActiveProvider();
    }

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'No active sandbox. Please create or reconnect to a sandbox first.' },
        { status: 400 }
      );
    }

    console.log('[create-zip] Creating project zip...');

    const zipCmd = [
      'set -e',
      'WORKDIR="/vercel/sandbox"',
      '[ -d "$WORKDIR" ] || WORKDIR="$PWD"',
      'cd "$WORKDIR"',
      'rm -f /tmp/project.zip',
      'zip -qr /tmp/project.zip . -x "node_modules/*" ".git/*" ".next/*" "dist/*" "build/*" "*.log"',
    ].join('; ');

    const zipResult = await provider.runCommand(zipCmd);

    if (!zipResult.success || zipResult.exitCode !== 0) {
      throw new Error(`Failed to create zip: ${zipResult.stderr || 'unknown error'}`);
    }

    const sizeResult = await provider.runCommand(`ls -la /tmp/project.zip | awk '{print $5}'`);
    console.log(`[create-zip] project.zip (${sizeResult.stdout.trim()} bytes)`);

    const readResult = await provider.runCommand('base64 /tmp/project.zip | tr -d "\\n"');

    if (!readResult.success || readResult.exitCode !== 0) {
      throw new Error(`Failed to read zip: ${readResult.stderr || 'unknown error'}`);
    }

    const base64Content = readResult.stdout.trim();
    const dataUrl = `data:application/zip;base64,${base64Content}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      fileName: 'noeron-project.zip',
    });

  } catch (error) {
    console.error('[create-zip] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
