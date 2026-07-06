import { NextResponse } from 'next/server';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sandboxId } = body as { sandboxId?: string };
    const resolved = await resolveRequestSandbox(sandboxId);

    if (!resolved.ok) {
      return resolved.response;
    }

    const provider = resolved.value.provider;
    console.log('[create-zip] Creating project zip for sandbox:', resolved.value.sandboxId);

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
