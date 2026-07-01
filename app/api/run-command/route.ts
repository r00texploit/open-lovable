import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

export async function POST(request: NextRequest) {
  try {
    const { command, sandboxId } = await request.json();
    
    if (!command) {
      return NextResponse.json({ 
        success: false, 
        error: 'Command is required' 
      }, { status: 400 });
    }
    
    const resolved = await resolveRequestSandbox(sandboxId);

    if (!resolved.ok) {
      return resolved.response;
    }
    
    console.log(`[run-command] Executing in ${resolved.value.sandboxId}: ${command}`);
    
    const result = await resolved.value.provider.runCommand(command);
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    
    const output = [
      stdout ? `STDOUT:\n${stdout}` : '',
      stderr ? `\nSTDERR:\n${stderr}` : '',
      `\nExit code: ${result.exitCode}`
    ].filter(Boolean).join('');
    
    return NextResponse.json({
      success: true,
      output,
      exitCode: result.exitCode,
      message: result.exitCode === 0 ? 'Command executed successfully' : 'Command completed with non-zero exit code'
    });
    
  } catch (error) {
    console.error('[run-command] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
