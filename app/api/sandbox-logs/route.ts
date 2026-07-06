import { NextResponse } from 'next/server';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resolved = await resolveRequestSandbox(searchParams.get('sandboxId') || searchParams.get('sandbox'));

    if (!resolved.ok) {
      return resolved.response;
    }
    
    const provider = resolved.value.provider;
    console.log('[sandbox-logs] Fetching Vite dev server logs for sandbox:', resolved.value.sandboxId);
    
    // Check if Vite processes are running
    const psResult = await provider.runCommand('ps aux');
    
    let viteRunning = false;
    const logContent: string[] = [];
    
    if (psResult.exitCode === 0) {
      const psOutput = psResult.stdout || '';
      const viteProcesses = psOutput.split('\n').filter((line: string) => 
        line.toLowerCase().includes('vite') || 
        line.toLowerCase().includes('npm run dev')
      );
      
      viteRunning = viteProcesses.length > 0;
      
      if (viteRunning) {
        logContent.push("Vite is running");
        logContent.push(...viteProcesses.slice(0, 3)); // Show first 3 processes
      } else {
        logContent.push("Vite process not found");
      }
    }
    
    // Try to read any recent log files
    try {
      const findResult = await provider.runCommand(`find /tmp -name '*vite*' -name '*.log' -type f`);
      
      if (findResult.exitCode === 0) {
        const logFiles = (findResult.stdout || '').split('\n').filter((f: string) => f.trim());
        
        for (const logFile of logFiles.slice(0, 2)) {
          try {
            const catResult = await provider.runCommand(`tail -n 10 ${shellQuote(logFile)}`);
            
            if (catResult.exitCode === 0) {
              const logFileContent = catResult.stdout || '';
              logContent.push(`--- ${logFile} ---`);
              logContent.push(logFileContent);
            }
          } catch {
            // Skip if can't read log file
          }
        }
      }
    } catch {
      // No log files found, that's OK
    }
    
    return NextResponse.json({
      success: true,
      hasErrors: false,
      logs: logContent,
      status: viteRunning ? 'running' : 'stopped'
    });
    
  } catch (error) {
    console.error('[sandbox-logs] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
