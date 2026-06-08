import { NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sandboxId } = body;

    let provider = sandboxId
      ? (sandboxManager.getProvider(sandboxId) ?? await sandboxManager.getOrCreateProvider(sandboxId).catch(() => null))
      : sandboxManager.getActiveProvider();

    if (!provider) {
      provider = global.activeSandboxProvider ?? null;
    }

    const rawSandbox = provider?.sandbox ?? global.activeSandbox ?? null;

    if (!rawSandbox?.runCommand) {
      return NextResponse.json({
        success: false,
        error: 'No active sandbox. Please create or reconnect to a sandbox first.'
      }, { status: 400 });
    }

    console.log('[create-zip] Creating project zip...');

    const zipResult = await rawSandbox.runCommand({
      cmd: 'bash',
      args: [
        '-lc',
        [
          'set -e',
          'WORKDIR="/vercel/sandbox"',
          '[ -d "$WORKDIR" ] || WORKDIR="$PWD"',
          'cd "$WORKDIR"',
          'rm -f /tmp/project.zip',
          'zip -qr /tmp/project.zip . -x "node_modules/*" ".git/*" ".next/*" "dist/*" "build/*" "*.log"'
        ].join('; ')
      ]
    });

    if (zipResult.exitCode !== 0) {
      const error = await readOutput(zipResult.stderr);
      throw new Error(`Failed to create zip: ${error}`);
    }

    const sizeResult = await rawSandbox.runCommand({
      cmd: 'bash',
      args: ['-lc', `ls -la /tmp/project.zip | awk '{print $5}'`]
    });
    const fileSize = (await readOutput(sizeResult.stdout)).trim();
    console.log(`[create-zip] project.zip (${fileSize} bytes)`);

    const readResult = await rawSandbox.runCommand({
      cmd: 'bash',
      args: ['-lc', 'base64 /tmp/project.zip | tr -d "\\n"']
    });

    if (readResult.exitCode !== 0) {
      const error = await readOutput(readResult.stderr);
      throw new Error(`Failed to read zip: ${error}`);
    }

    const base64Content = (await readOutput(readResult.stdout)).trim();
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

async function readOutput(output: unknown): Promise<string> {
  if (typeof output === 'function') return await output();
  if (typeof output === 'string') return output;
  return output == null ? '' : String(output);
}
