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
    const writtenPaths = new Set<string>();

    for (const [rawPath, content] of Object.entries(files)) {
      if (typeof content !== 'string' || isBinaryPlaceholder(content)) {
        skipped++;
        continue;
      }
      const path = normalizeRestorePath(rawPath);
      try {
        await provider.writeFile(path, content);
        writtenPaths.add(path);
        written++;
      } catch (err: any) {
        errors.push(`${path}: ${err.message}`);
      }
    }

    // Generated sites are .jsx-based, but the fresh sandbox scaffold boots
    // index.html -> src/main.tsx -> src/App.tsx. index.html is never captured
    // into fileCache (the file sync only lists js/jsx/ts/tsx/css/json), so
    // without this fixup the scaffold entry keeps rendering "Sandbox Ready"
    // while the restored .jsx app sits unreferenced next to it — the same
    // entry-point switch apply-ai-code-stream performs after generation.
    const hasJsxApp = writtenPaths.has('src/App.jsx');
    let hasJsxMain = writtenPaths.has('src/main.jsx');

    if (hasJsxApp || hasJsxMain) {
      try {
        await provider.runCommand('rm -f src/App.tsx src/main.tsx');

        if (!hasJsxMain) {
          const mainJsxContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
          await provider.writeFile('src/main.jsx', mainJsxContent);
          hasJsxMain = true;
        }

        const currentIndexHtml = await provider.readFile('index.html');
        const updatedIndexHtml = currentIndexHtml.replace(
          /src\/(main|index)\.(jsx|tsx)/,
          'src/main.jsx'
        );
        if (updatedIndexHtml !== currentIndexHtml) {
          await provider.writeFile('index.html', updatedIndexHtml);
          console.log('[restore-files] Updated index.html entry point to src/main.jsx');
        }
      } catch (err: any) {
        console.warn('[restore-files] Entry point fixup failed:', err);
        errors.push(`entry-point fixup: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, written, skipped, errors });
  } catch (error: any) {
    console.error('[restore-files] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
