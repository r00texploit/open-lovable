import { NextRequest, NextResponse } from 'next/server';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';

// Files that live at the project root rather than under src/
const ROOT_FILES = new Set([
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tailwind.config.js',
  'vite.config.js',
  'postcss.config.js',
  'eslint.config.js',
]);

// Sessions saved by older pipeline versions used different roots
// (e2b's /home/user/app, an app/ prefix, absolute paths) and sometimes
// dropped the src/ prefix. Writing those keys verbatim lands files in a
// subtree Vite never serves, so restores "succeed" without changing the
// running app. Normalize to sandbox-relative project paths.
function normalizeRestorePath(input: string): string {
  let p = input.trim().replace(/^\/+/, '');
  p = p.replace(/^home\/user\/app\//, '');
  p = p.replace(/^vercel\/sandbox\//, '');
  p = p.replace(/^app\//, '');

  const fileName = p.split('/').pop() || '';
  if (!p.startsWith('src/') && !p.startsWith('public/') && !ROOT_FILES.has(fileName)) {
    p = `src/${p}`;
  }
  return p;
}

function isBinaryPlaceholder(content: string): boolean {
  return content.startsWith('[Binary image');
}

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

    let written = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [rawPath, content] of Object.entries(files)) {
      if (typeof content !== 'string' || isBinaryPlaceholder(content)) {
        skipped++;
        continue;
      }
      const path = normalizeRestorePath(rawPath);
      try {
        await provider.writeFile(path, content);
        written++;
      } catch (err: any) {
        errors.push(`${path}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, written, skipped, errors });
  } catch (error: any) {
    console.error('[restore-files] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
