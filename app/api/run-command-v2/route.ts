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
    
    console.log(`[run-command-v2] Executing in ${resolved.value.sandboxId}: ${command}`);
    
    const result = await resolved.value.provider.runCommand(command);
    
    return NextResponse.json({
      success: result.success,
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode,
      message: result.success ? 'Command executed successfully' : 'Command failed'
    });
    
  } catch (error) {
    console.error('[run-command-v2] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
