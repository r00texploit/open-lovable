import { NextResponse } from 'next/server';
import { parseJavaScriptFile, buildComponentTree } from '@/lib/file-parser';
import { FileManifest, FileInfo, RouteInfo } from '@/types/file-manifest';
import { sandboxManager } from '@/lib/sandbox/sandbox-manager';
import type { SandboxState } from '@/types/sandbox';
// SandboxState type used implicitly through global.activeSandbox

declare global {
  var activeSandbox: any;
  var activeSandboxProvider: any;
  var sandboxState: SandboxState;
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function commandStdout(sandbox: any, command: string) {
  const result = await sandbox.runCommand(command);
  const stdout = typeof result.stdout === 'function' ? await result.stdout() : result.stdout;
  const exitCode = typeof result.exitCode === 'number' ? result.exitCode : 0;
  return { stdout: stdout || '', exitCode };
}

function cachedFilesFromState() {
  const rawFiles = global.sandboxState?.fileCache?.files;
  if (!rawFiles || typeof rawFiles !== 'object') return null;

  return Object.fromEntries(
    Object.entries(rawFiles).map(([path, value]: [string, any]) => [
      path,
      typeof value === 'string' ? value : value?.content ?? '',
    ]).filter(([, content]) => typeof content === 'string')
  ) as Record<string, string>;
}

export async function GET() {
  try {
    const sandbox = global.activeSandbox || global.activeSandboxProvider || sandboxManager.getActiveProvider();
    if (!sandbox) {
      const cachedFiles = cachedFilesFromState();
      if (cachedFiles && Object.keys(cachedFiles).length > 0) {
        return NextResponse.json({
          success: true,
          files: cachedFiles,
          structure: '',
          fileCount: Object.keys(cachedFiles).length,
          manifest: buildManifest(cachedFiles),
          fromCache: true,
        });
      }
      return NextResponse.json({
        success: false,
        error: 'No active sandbox'
      }, { status: 404 });
    }

    console.log('[get-sandbox-files] Fetching and analyzing file structure...');

    // Get code files and image files separately
    const getFilesList = async () => {
      if (typeof sandbox.listFiles === 'function') {
        const allFiles = await sandbox.listFiles();
        return {
          codeFiles: allFiles.filter((filePath: string) => /\.(jsx?|tsx?|css|json)$/.test(filePath)),
          imageFiles: allFiles.filter((filePath: string) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(filePath))
        };
      } else {
        const codeResult = await commandStdout(
          sandbox,
          `find . -name node_modules -prune -o -name .git -prune -o -name dist -prune -o -name build -prune -o -type f \\( -name '*.jsx' -o -name '*.js' -o -name '*.tsx' -o -name '*.ts' -o -name '*.css' -o -name '*.json' \\) -print`
        );
        const imageResult = await commandStdout(
          sandbox,
          `find . -name node_modules -prune -o -name .git -prune -o -name dist -prune -o -name build -prune -o -type f \\( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.gif' -o -name '*.webp' -o -name '*.svg' \\) -print`
        );
        return {
          codeFiles: codeResult.stdout.split('\n').filter((f: string) => f.trim()),
          imageFiles: imageResult.stdout.split('\n').filter((f: string) => f.trim())
        };
      }
    };

    const { codeFiles, imageFiles } = await getFilesList();
    const fileList = codeFiles;

    if (!Array.isArray(fileList)) {
      throw new Error('Failed to list files');
    }

    console.log('[get-sandbox-files] Found', fileList.length, 'code files +', imageFiles.length, 'image files');

    // Read content of each file (limit to reasonable sizes)
    const filesContent: Record<string, string> = {};

    for (const filePath of fileList) {
      try {
        const relativePath = filePath.replace(/^\.\//, '');
        if (typeof sandbox.readFile === 'function') {
          const content = await sandbox.readFile(relativePath);
          if (content.length < 10000) filesContent[relativePath] = content;
        } else {
          const sizeResult = await commandStdout(sandbox, `wc -c < ${shellQuote(filePath)}`);
          const fileSize = parseInt(sizeResult.stdout, 10);
          if (sizeResult.exitCode === 0 && fileSize < 10000) {
            const catResult = await commandStdout(sandbox, `cat ${shellQuote(filePath)}`);
            if (catResult.exitCode === 0) filesContent[relativePath] = catResult.stdout;
          }
        }
      } catch (parseError) {
        console.debug('Error parsing component info:', parseError);
        // Skip files that can't be read
        continue;
      }
    }

    // Add image files to the content list (mark as binary/image)
    for (const imagePath of imageFiles) {
      const relativePath = imagePath.replace(/^\.\//, '');
      if (relativePath) {
        filesContent[relativePath] = `[Binary image file]`;
      }
    }

    // Get directory structure
    let structure = '';
    if (typeof sandbox.runCommand === 'function') {
      const treeResult = await commandStdout(sandbox, `find . -type d -not -path '*/node_modules*' -not -path '*/.git*'`);
      if (treeResult.exitCode === 0) {
      const dirs = treeResult.stdout.split('\n').filter((d: string) => d.trim());
      structure = dirs.slice(0, 50).join('\n'); // Limit to 50 lines
      }
    }

    const fileManifest = buildManifest(filesContent);

    // Update global file cache with manifest
    if (global.sandboxState?.fileCache) {
      global.sandboxState.fileCache.manifest = fileManifest;
    }

    return NextResponse.json({
      success: true,
      files: filesContent,
      structure,
      fileCount: Object.keys(filesContent).length,
      manifest: fileManifest,
    });

  } catch (error) {
    console.error('[get-sandbox-files] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

function buildManifest(filesContent: Record<string, string>): FileManifest {
  const fileManifest: FileManifest = {
      files: {},
      routes: [],
      componentTree: {},
      entryPoint: '',
      styleFiles: [],
      timestamp: Date.now(),
  };

  // Process each file
  for (const [relativePath, content] of Object.entries(filesContent)) {
    const fullPath = `/${relativePath}`;

    // Create base file info
    const fileInfo: FileInfo = {
      content: content,
      type: 'utility',
      path: fullPath,
      relativePath,
      lastModified: Date.now(),
    };

    // Parse JavaScript/JSX files
    if (relativePath.match(/\.(jsx?|tsx?)$/)) {
      const parseResult = parseJavaScriptFile(content, fullPath);
      Object.assign(fileInfo, parseResult);

      // Identify entry point
      if (relativePath === 'src/main.jsx' || relativePath === 'src/index.jsx') {
        fileManifest.entryPoint = fullPath;
      }

      // Identify App.jsx
      if (relativePath === 'src/App.jsx' || relativePath === 'App.jsx') {
        fileManifest.entryPoint = fileManifest.entryPoint || fullPath;
      }
    }

    // Track style files
    if (relativePath.endsWith('.css')) {
      fileManifest.styleFiles.push(fullPath);
      fileInfo.type = 'style';
    }

    fileManifest.files[fullPath] = fileInfo;
  }

  // Build component tree
  fileManifest.componentTree = buildComponentTree(fileManifest.files);

  // Extract routes (simplified - looks for Route components or page pattern)
  fileManifest.routes = extractRoutes(fileManifest.files);

  return fileManifest;
}

function extractRoutes(files: Record<string, FileInfo>): RouteInfo[] {
  const routes: RouteInfo[] = [];

  // Look for React Router usage
  for (const [path, fileInfo] of Object.entries(files)) {
    if (fileInfo.content.includes('<Route') || fileInfo.content.includes('createBrowserRouter')) {
      // Extract route definitions (simplified)
      const routeMatches = fileInfo.content.matchAll(/path=["']([^"']+)["'].*(?:element|component)={([^}]+)}/g);

      for (const match of routeMatches) {
        const [, routePath] = match;
        // componentRef available in match but not used currently
        routes.push({
          path: routePath,
          component: path,
        });
      }
    }

    // Check for Next.js style pages
    if (fileInfo.relativePath.startsWith('pages/') || fileInfo.relativePath.startsWith('src/pages/')) {
      const routePath = '/' + fileInfo.relativePath
        .replace(/^(src\/)?pages\//, '')
        .replace(/\.(jsx?|tsx?)$/, '')
        .replace(/index$/, '');

      routes.push({
        path: routePath,
        component: path,
      });
    }
  }

  return routes;
}
