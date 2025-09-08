import { NextResponse } from 'next/server';

declare global {
  var activeSandbox: any;
  var lastViteRestartTime: number;
  var viteRestartInProgress: boolean;
}

const RESTART_COOLDOWN_MS = 5000; // 5 second cooldown between restarts

export async function POST() {
  try {
    if (!global.activeSandbox) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active sandbox' 
      }, { status: 400 });
    }
    
    // Check if restart is already in progress
    if (global.viteRestartInProgress) {
      console.log('[restart-vite] Vite restart already in progress, skipping...');
      return NextResponse.json({
        success: true,
        message: 'Vite restart already in progress'
      });
    }
    
    // Check cooldown
    const now = Date.now();
    if (global.lastViteRestartTime && (now - global.lastViteRestartTime) < RESTART_COOLDOWN_MS) {
      const remainingTime = Math.ceil((RESTART_COOLDOWN_MS - (now - global.lastViteRestartTime)) / 1000);
      console.log(`[restart-vite] Cooldown active, ${remainingTime}s remaining`);
      return NextResponse.json({
        success: true,
        message: `Vite was recently restarted, cooldown active (${remainingTime}s remaining)`
      });
    }
    
    // Set the restart flag
    global.viteRestartInProgress = true;
    
    console.log('[restart-vite] Forcing Vite restart...');
    
    // Kill existing Vite processes
    try {
      await global.activeSandbox.runCommand({
        cmd: 'pkill',
        args: ['-f', 'vite']
      });
      console.log('[restart-vite] Killed existing Vite processes');
      
      // Wait a moment for processes to terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      console.log('[restart-vite] No existing Vite processes found');
    }
    
    // Clear any error tracking files
    try {
      await global.activeSandbox.runCommand({
        cmd: 'bash',
        args: ['-c', 'echo \'{"errors": [], "lastChecked": '+ Date.now() +'}\' > /tmp/vite-errors.json']
      });
    } catch {
      // Ignore if this fails
    }
    
    // Start Vite dev server in detached mode
    // Start Vite dev server in detached mode
    await global.activeSandbox.runCommand({
      cmd: 'npm',
      args: ['run', 'dev'],
      detached: true
    });
    
    console.log('[restart-vite] Vite dev server restarted');
    
    // Wait for Vite to start up
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update global state
    global.lastViteRestartTime = Date.now();
    global.viteRestartInProgress = false;
    
    return NextResponse.json({
      success: true,
      message: 'Vite restarted successfully'
    });
    
  } catch (error) {
    console.error('[restart-vite] Error:', error);
    
    // Clear the restart flag on error
    global.viteRestartInProgress = false;
    
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}