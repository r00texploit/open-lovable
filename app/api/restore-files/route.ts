import { NextRequest, NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';

// POST /api/restore-files — write saved files back into a sandbox after recreation
export async function POST(request: NextRequest) {
  try {
    const { sandboxId, files } = await request.json() as {
      sandboxId: string;
      files: Record<string, string>;
    };

    if (!sandboxId || !files || typeof files !== 'object') {
      return NextResponse.json({ error: 'sandboxId and files are required' }, { status: 400 });
    }

    let provider = sandboxManager.getProvider(sandboxId);
    if (!provider) {
      try {
        provider = await sandboxManager.getOrCreateProvider(sandboxId);
      } catch {
        return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 });
      }
    }

    const entries = Object.entries(files);
    let written = 0;
    const errors: string[] = [];

    for (const [path, content] of entries) {
      try {
        await provider.writeFile(path, content);
        written++;
      } catch (err: any) {
        errors.push(`${path}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, written, errors });
  } catch (error: any) {
    console.error('[restore-files] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
