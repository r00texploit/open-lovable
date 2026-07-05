import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

export async function POST(request: NextRequest) {
  try {
    const { packages, sandboxId } = await request.json();
    
    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Packages array is required' 
      }, { status: 400 });
    }
    
    const resolved = await resolveRequestSandbox(sandboxId);
    
    if (!resolved.ok) {
      return resolved.response;
    }
    
    console.log(`[install-packages-v2] Installing in ${resolved.value.sandboxId}: ${packages.join(', ')}`);
    
    const result = await resolved.value.provider.installPackages(packages);
    
    return NextResponse.json({
      success: result.success,
      output: result.stdout,
      error: result.stderr,
      message: result.success ? 'Packages installed successfully' : 'Package installation failed'
    });
    
  } catch (error) {
    console.error('[install-packages-v2] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
