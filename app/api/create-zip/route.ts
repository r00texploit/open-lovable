import { NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';

declare global {
  var activeSandbox: any;
  var activeSandboxProvider: any;
}

export async function POST() {
  try {
    const provider = sandboxManager.getActiveProvider() || global.activeSandboxProvider;
    const rawSandbox = provider?.sandbox || global.activeSandbox;

    if (!rawSandbox?.runCommand) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active sandbox' 
      }, { status: 400 });
    }
    
    console.log('[create-zip] Creating project zip...');
    
    // Create zip file in sandbox using standard commands. V2 Vercel sandboxes
    // keep files in /vercel/sandbox; legacy raw sandboxes usually start there.
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
      const error = await readCommandOutput(zipResult.stderr);
      throw new Error(`Failed to create zip: ${error}`);
    }
    
    const sizeResult = await rawSandbox.runCommand({
      cmd: 'bash',
      args: ['-lc', `ls -la /tmp/project.zip | awk '{print $5}'`]
    });
    
    const fileSize = await readCommandOutput(sizeResult.stdout);
    console.log(`[create-zip] Created project.zip (${fileSize.trim()} bytes)`);
    
    // Read the zip file and convert to base64
    const readResult = await rawSandbox.runCommand({
      cmd: 'bash',
      args: ['-lc', 'base64 /tmp/project.zip | tr -d "\\n"']
    });
    
    if (readResult.exitCode !== 0) {
      const error = await readCommandOutput(readResult.stderr);
      throw new Error(`Failed to read zip file: ${error}`);
    }
    
    const base64Content = (await readCommandOutput(readResult.stdout)).trim();
    
    // Create a data URL for download
    const dataUrl = `data:application/zip;base64,${base64Content}`;
    
    return NextResponse.json({
      success: true,
      dataUrl,
      fileName: 'vercel-sandbox-project.zip',
      message: 'Zip file created successfully'
    });
    
  } catch (error) {
    console.error('[create-zip] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      }, 
      { status: 500 }
    );
  }
}

async function readCommandOutput(output: unknown): Promise<string> {
  if (typeof output === 'function') {
    return await output();
  }

  if (typeof output === 'string') {
    return output;
  }

  return output == null ? '' : String(output);
}
