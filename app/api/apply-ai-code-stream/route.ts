import { NextRequest, NextResponse } from 'next/server';
import { parseMorphEdits, applyMorphEditToFile } from '@/lib/morph-fast-apply';
import type { SandboxState } from '@/types/sandbox';
import type { ConversationState } from '@/types/conversation';
import { sanitizeLucideImports } from '@/lib/ai/sanitize-lucide-imports';
import { getUploadedImageSandboxPath } from '@/lib/ai/uploaded-image-paths';
import {
  getSandboxState,
  setSandboxState,
  initSandboxState,
  updateSandboxFile,
} from '@/lib/sandbox/sandbox-state';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';

declare global {
  var conversationState: ConversationState | null;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

interface ParsedResponse {
  explanation: string;
  template: string;
  files: Array<{ path: string; content: string }>;
  packages: string[];
  commands: string[];
  structure: string | null;
}

function sanitizeJsxTypeScriptSyntax(content: string): string {
  return content
    // Remove standalone type/interface declarations that are invalid in .jsx files.
    .replace(/\n\s*(?:export\s+)?(?:interface|type)\s+\w+[\s\S]*?(?=\n\s*(?:export\s+default\s+)?(?:function|const|let|var|class)\b|$)/g, '\n')
    // Convert hook generics: useRef<Record<string, HTMLElement | null>>({}) -> useRef({})
    .replace(/\b(use(?:Ref|State|Memo|Callback|Reducer))<[^)]*>\(/g, '$1(')
    // Convert typed variables: const item: MenuItem = ... -> const item = ...
    .replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;]+=/g, '$1 $2 =')
    // Convert typed params: (id: string, el: HTMLElement | null) -> (id, el).
    // Keep object literal values like { hot: useRef(null) } intact.
    .replace(/([,(]\s*[A-Za-z_$][\w$]*)\s*:\s*(?:string|number|boolean|unknown|any|HTMLElement|HTML\w+Element|Record<[^)]*>|React\.[^,)=]+|[A-Z][A-Za-z0-9_$]*(?:<[^>]*>)?)(?:\s*\|\s*(?:null|undefined|string|number|boolean|[A-Z][A-Za-z0-9_$]*))*\s*(?=[,)=])/g, '$1')
    // Convert arrow return types: (props): JSX.Element => -> (props) =>
    .replace(/\)\s*:\s*[^=({]+=>/g, ') =>')
    // Convert: function Card({ a }: { a: string }) { ... }
    // To:      function Card({ a }) { ... }
    .replace(/(\bfunction\s+\w+\s*\(\s*\{[\s\S]*?\n\s*\})\s*:\s*\{[\s\S]*?\n\s*\}\s*\)/g, '$1)')
    // Convert: const Card = ({ a }: { a: string }) => ...
    // To:      const Card = ({ a }) => ...
    .replace(/(\(\s*\{[\s\S]*?\n\s*\})\s*:\s*\{[\s\S]*?\n\s*\}\s*\)\s*=>/g, '$1) =>')
    .replace(/\s+as\s+const\b/g, '');
}

function parseAIResponse(response: string): ParsedResponse {
  const sections = {
    files: [] as Array<{ path: string; content: string }>,
    commands: [] as string[],
    packages: [] as string[],
    structure: null as string | null,
    explanation: '',
    template: ''
  };

  // Function to extract packages from import statements
  function extractPackagesFromCode(content: string): string[] {
    const packages: string[] = [];
    // Match ES6 imports
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    let importMatch;

    while ((importMatch = importRegex.exec(content)) !== null) {
      const importPath = importMatch[1];
      // Skip relative imports and built-in React
      if (!importPath.startsWith('.') && !importPath.startsWith('/') &&
        importPath !== 'react' && importPath !== 'react-dom' &&
        !importPath.startsWith('@/')) {
        // Extract package name (handle scoped packages like @heroicons/react)
        const packageName = importPath.startsWith('@')
          ? importPath.split('/').slice(0, 2).join('/')
          : importPath.split('/')[0];

        if (!packages.includes(packageName)) {
          packages.push(packageName);

          // Log important packages for debugging
          if (packageName === 'react-router-dom' || packageName.includes('router') || packageName.includes('icon')) {
            console.log(`[apply-ai-code-stream] Detected package from imports: ${packageName}`);
          }
        }
      }
    }

    return packages;
  }

  // Parse file sections - handle duplicates and prefer complete versions
  const fileMap = new Map<string, { content: string; isComplete: boolean }>();

  // First pass: Find all file declarations
  const fileRegex = /<file path="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;
  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    const filePath = match[1];
    const content = match[2].trim();
    const hasClosingTag = response.substring(match.index, match.index + match[0].length).includes('</file>');

    // Check if this file already exists in our map
    const existing = fileMap.get(filePath);

    // Decide whether to keep this version
    let shouldReplace = false;
    if (!existing) {
      shouldReplace = true; // First occurrence
    } else if (!existing.isComplete && hasClosingTag) {
      shouldReplace = true; // Replace incomplete with complete
      console.log(`[apply-ai-code-stream] Replacing incomplete ${filePath} with complete version`);
    } else if (existing.isComplete && hasClosingTag && content.length > existing.content.length) {
      shouldReplace = true; // Replace with longer complete version
      console.log(`[apply-ai-code-stream] Replacing ${filePath} with longer complete version`);
    } else if (!existing.isComplete && !hasClosingTag && content.length > existing.content.length) {
      shouldReplace = true; // Both incomplete, keep longer one
    }

    if (shouldReplace) {
      // Additional validation: reject obviously broken content
      if (content.includes('...') && !content.includes('...props') && !content.includes('...rest')) {
        console.warn(`[apply-ai-code-stream] Warning: ${filePath} contains ellipsis, may be truncated`);
        // Still use it if it's the only version we have
        if (!existing) {
          fileMap.set(filePath, { content, isComplete: hasClosingTag });
        }
      } else {
        fileMap.set(filePath, { content, isComplete: hasClosingTag });
      }
    }
  }

  // Convert map to array for sections.files
  for (const [path, { content, isComplete }] of fileMap.entries()) {
    if (!isComplete) {
      console.log(`[apply-ai-code-stream] Warning: File ${path} appears to be truncated (no closing tag)`);
    }

    sections.files.push({
      path,
      content
    });

    // Extract packages from file content
    const filePackages = extractPackagesFromCode(content);
    for (const pkg of filePackages) {
      if (!sections.packages.includes(pkg)) {
        sections.packages.push(pkg);
        console.log(`[apply-ai-code-stream] 📦 Package detected from imports: ${pkg}`);
      }
    }
  }

  // Also parse markdown code blocks with file paths
  const markdownFileRegex = /```(?:file )?path="([^"]+)"\n([\s\S]*?)```/g;
  while ((match = markdownFileRegex.exec(response)) !== null) {
    const filePath = match[1];
    const content = match[2].trim();
    sections.files.push({
      path: filePath,
      content: content
    });

    // Extract packages from file content
    const filePackages = extractPackagesFromCode(content);
    for (const pkg of filePackages) {
      if (!sections.packages.includes(pkg)) {
        sections.packages.push(pkg);
        console.log(`[apply-ai-code-stream] 📦 Package detected from imports: ${pkg}`);
      }
    }
  }

  // Parse plain text format like "Generated Files: Header.jsx, index.css"
  const generatedFilesMatch = response.match(/Generated Files?:\s*([^\n]+)/i);
  if (generatedFilesMatch) {
    // Split by comma first, then trim whitespace, to preserve filenames with dots
    const filesList = generatedFilesMatch[1]
      .split(',')
      .map(f => f.trim())
      .filter(f => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css') || f.endsWith('.json') || f.endsWith('.html'));
    console.log(`[apply-ai-code-stream] Detected generated files from plain text: ${filesList.join(', ')}`);

    // Try to extract the actual file content if it follows
    for (const fileName of filesList) {
      // Look for the file content after the file name
      const fileContentRegex = new RegExp(`${fileName}[\\s\\S]*?(?:import[\\s\\S]+?)(?=Generated Files:|Applying code|$)`, 'i');
      const fileContentMatch = response.match(fileContentRegex);
      if (fileContentMatch) {
        // Extract just the code part (starting from import statements)
        const codeMatch = fileContentMatch[0].match(/^(import[\s\S]+)$/m);
        if (codeMatch) {
          const filePath = fileName.includes('/') ? fileName : `src/components/${fileName}`;
          sections.files.push({
            path: filePath,
            content: codeMatch[1].trim()
          });
          console.log(`[apply-ai-code-stream] Extracted content for ${filePath}`);

          // Extract packages from this file
          const filePackages = extractPackagesFromCode(codeMatch[1]);
          for (const pkg of filePackages) {
            if (!sections.packages.includes(pkg)) {
              sections.packages.push(pkg);
              console.log(`[apply-ai-code-stream] Package detected from imports: ${pkg}`);
            }
          }
        }
      }
    }
  }

  // Also try to parse if the response contains raw JSX/JS code blocks
  const codeBlockRegex = /```(?:jsx?|tsx?|javascript|typescript)?\n([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const content = match[1].trim();
    // Try to detect the file name from comments or context
    const fileNameMatch = content.match(/\/\/\s*(?:File:|Component:)\s*([^\n]+)/);
    if (fileNameMatch) {
      const fileName = fileNameMatch[1].trim();
      const filePath = fileName.includes('/') ? fileName : `src/components/${fileName}`;

      // Don't add duplicate files
      if (!sections.files.some(f => f.path === filePath)) {
        sections.files.push({
          path: filePath,
          content: content
        });

        // Extract packages
        const filePackages = extractPackagesFromCode(content);
        for (const pkg of filePackages) {
          if (!sections.packages.includes(pkg)) {
            sections.packages.push(pkg);
          }
        }
      }
    }
  }

  // Parse commands
  const cmdRegex = /<command>(.*?)<\/command>/g;
  while ((match = cmdRegex.exec(response)) !== null) {
    sections.commands.push(match[1].trim());
  }

  // Parse packages - support both <package> and <packages> tags
  const pkgRegex = /<package>(.*?)<\/package>/g;
  while ((match = pkgRegex.exec(response)) !== null) {
    sections.packages.push(match[1].trim());
  }

  // Also parse <packages> tag with multiple packages
  const packagesRegex = /<packages>([\s\S]*?)<\/packages>/;
  const packagesMatch = response.match(packagesRegex);
  if (packagesMatch) {
    const packagesContent = packagesMatch[1].trim();
    // Split by newlines or commas
    const packagesList = packagesContent.split(/[\n,]+/)
      .map(pkg => pkg.trim())
      .filter(pkg => pkg.length > 0);
    sections.packages.push(...packagesList);
  }

  // Parse structure
  const structureMatch = /<structure>([\s\S]*?)<\/structure>/;
  const structResult = response.match(structureMatch);
  if (structResult) {
    sections.structure = structResult[1].trim();
  }

  // Parse explanation
  const explanationMatch = /<explanation>([\s\S]*?)<\/explanation>/;
  const explResult = response.match(explanationMatch);
  if (explResult) {
    sections.explanation = explResult[1].trim();
  }

  // Parse template
  const templateMatch = /<template>(.*?)<\/template>/;
  const templResult = response.match(templateMatch);
  if (templResult) {
    sections.template = templResult[1].trim();
  }

  return sections;
}

export async function POST(request: NextRequest) {
  try {
    const { response, isEdit = false, packages = [], sandboxId, uploadedImages } = await request.json();

    const resolved = await resolveRequestSandbox(sandboxId);
    if (!resolved.ok) {
      return resolved.response;
    }

    // Initialize sandbox-scoped state for multi-sandbox support
    const effectiveSandboxId = resolved.value.sandboxId;
    const sandboxState = initSandboxState(effectiveSandboxId);

    if (!response) {
      return NextResponse.json({
        error: 'response is required'
      }, { status: 400 });
    }

    // Debug log the response
    console.log('[apply-ai-code-stream] Received response to parse:');
    console.log('[apply-ai-code-stream] Response length:', response.length);
    console.log('[apply-ai-code-stream] Response preview:', response.substring(0, 500));
    console.log('[apply-ai-code-stream] isEdit:', isEdit);
    console.log('[apply-ai-code-stream] packages:', packages);

    // Parse the AI response
    const parsed = parseAIResponse(response);
    const morphEnabled = Boolean(isEdit && process.env.MORPH_API_KEY);
    const morphEdits = morphEnabled ? parseMorphEdits(response) : [];
    console.log('[apply-ai-code-stream] Morph Fast Apply mode:', morphEnabled);
    if (morphEnabled) {
      console.log('[apply-ai-code-stream] Morph edits found:', morphEdits.length);
    }
    
    // Log what was parsed
    console.log('[apply-ai-code-stream] Parsed result:');
    console.log('[apply-ai-code-stream] Files found:', parsed.files.length);
    if (parsed.files.length > 0) {
      parsed.files.forEach(f => {
        console.log(`[apply-ai-code-stream] - ${f.path} (${f.content.length} chars)`);
      });
    }
    console.log('[apply-ai-code-stream] Packages found:', parsed.packages);

    // Initialize existingFiles if not already
    if (!global.existingFiles) {
      global.existingFiles = new Set<string>();
    }

    const provider = resolved.value.provider;

    // Create a response stream for real-time updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Function to send progress updates
    const sendProgress = async (data: any) => {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    };

    // Start processing in background (pass provider and request to the async function)
    (async (providerInstance, req) => {
      const results = {
        filesCreated: [] as string[],
        filesUpdated: [] as string[],
        packagesInstalled: [] as string[],
        packagesAlreadyInstalled: [] as string[],
        packagesFailed: [] as string[],
        commandsExecuted: [] as string[],
        errors: [] as string[]
      };

      try {
        // DEBUG: Log provider state
        console.log('[apply-ai-code-stream] DEBUG: Provider instance:', !!providerInstance);
        console.log('[apply-ai-code-stream] DEBUG: Provider sandboxInfo:', providerInstance?.getSandboxInfo());
        console.log('[apply-ai-code-stream] DEBUG: Provider isAlive:', providerInstance?.isAlive?.());

        await sendProgress({
          type: 'start',
          message: 'Starting code application...',
          totalSteps: 3,
          debug: { hasProvider: !!providerInstance, sandboxInfo: providerInstance?.getSandboxInfo() }
        });
        if (morphEnabled) {
          await sendProgress({ type: 'info', message: 'Morph Fast Apply enabled' });
          await sendProgress({ type: 'info', message: `Parsed ${morphEdits.length} Morph edits` });
          if (morphEdits.length === 0) {
            console.warn('[apply-ai-code-stream] Morph enabled but no <edit> blocks found; falling back to full-file flow');
            await sendProgress({ type: 'warning', message: 'Morph enabled but no <edit> blocks found; falling back to full-file flow' });
          }
        }
        
        // Step 1: Install packages
        const packagesArray = Array.isArray(packages) ? packages : [];
        const parsedPackages = Array.isArray(parsed.packages) ? parsed.packages : [];

        // Combine and deduplicate packages
        const allPackages = [...packagesArray.filter(pkg => pkg && typeof pkg === 'string'), ...parsedPackages];

        // Use Set to remove duplicates, then filter out pre-installed packages
        const uniquePackages = [...new Set(allPackages)]
          .filter(pkg => pkg && typeof pkg === 'string' && pkg.trim() !== '') // Remove empty strings
          .filter(pkg => pkg !== 'react' && pkg !== 'react-dom'); // Filter pre-installed

        // Log if we found duplicates
        if (allPackages.length !== uniquePackages.length) {
          console.log(`[apply-ai-code-stream] Removed ${allPackages.length - uniquePackages.length} duplicate packages`);
          console.log(`[apply-ai-code-stream] Original packages:`, allPackages);
          console.log(`[apply-ai-code-stream] Deduplicated packages:`, uniquePackages);
        }

        if (uniquePackages.length > 0) {
          await sendProgress({
            type: 'step',
            step: 1,
            message: `Installing ${uniquePackages.length} packages...`,
            packages: uniquePackages
          });

          // Use streaming package installation
          try {
            // Construct the API URL properly for both dev and production
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
            const host = req.headers.get('host') || 'localhost:3000';
            const apiUrl = `${protocol}://${host}/api/install-packages`;

            const installResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: req.headers.get('cookie') || '',
              },
              body: JSON.stringify({
                packages: uniquePackages,
                sandboxId: sandboxId || providerInstance.getSandboxInfo()?.sandboxId
              })
            });

            if (installResponse.ok && installResponse.body) {
              const reader = installResponse.body.getReader();
              const decoder = new TextDecoder();

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                if (!chunk) continue;
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));

                      // Forward package installation progress
                      await sendProgress({
                        type: 'package-progress',
                        ...data
                      });

                      // Track results
                      if (data.type === 'success' && data.installedPackages) {
                        results.packagesInstalled = data.installedPackages;
                      }
                    } catch (parseError) {
                      console.debug('Error parsing terminal output:', parseError);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('[apply-ai-code-stream] Error installing packages:', error);
            await sendProgress({
              type: 'warning',
              message: `Package installation skipped (${(error as Error).message}). Continuing with file creation...`
            });
            results.errors.push(`Package installation failed: ${(error as Error).message}`);
          }
        } else {
          await sendProgress({
            type: 'step',
            step: 1,
            message: 'No additional packages to install, skipping...'
          });
        }

        // Step 2: Create/update files
        const filesArray = Array.isArray(parsed.files) ? parsed.files : [];
        console.log(`[apply-ai-code-stream] DEBUG: Files to process: ${filesArray.length}`, filesArray.map((f: any) => f.path));
        await sendProgress({
          type: 'step',
          step: 2,
          message: `Creating ${filesArray.length} files...`
        });

        // Filter out config files that shouldn't be created
        const configFiles = ['tailwind.config.js', 'vite.config.js', 'package.json', 'package-lock.json', 'tsconfig.json', 'postcss.config.js'];
        let filteredFiles = filesArray.filter(file => {
          if (!file || typeof file !== 'object') return false;
          const fileName = (file.path || '').split('/').pop() || '';
          return !configFiles.includes(fileName);
        });

        // Handle file extension conflicts: delete .jsx files when .tsx files are being written
        const tsxFiles = filteredFiles.filter(f => f.path.endsWith('.tsx'));
        const jsxFiles = filteredFiles.filter(f => f.path.endsWith('.jsx'));
        const jsxFilesToDelete: string[] = [];
        const tsxFilesToDelete: string[] = [];
        let needsIndexHtmlUpdate = false;
        let newEntryFile: string | null = null;

        for (const tsxFile of tsxFiles) {
          const jsxPath = tsxFile.path.replace(/\.tsx$/, '.jsx');
          const normalizedJsxPath = jsxPath.startsWith('src/') ? jsxPath : 'src/' + jsxPath;
          const normalizedTsxPath = tsxFile.path.startsWith('src/') ? tsxFile.path : 'src/' + tsxFile.path;

          // Check if the .jsx version exists in tracked files
          if (global.existingFiles.has(normalizedJsxPath) || global.existingFiles.has(jsxPath)) {
            jsxFilesToDelete.push(normalizedJsxPath);
            console.log(`[apply-ai-code-stream] Will delete conflicting .jsx file: ${normalizedJsxPath} (replacing with ${normalizedTsxPath})`);
          }

          // Check if this is the main entry file (App.tsx or main.tsx)
          const fileName = tsxFile.path.split('/').pop() || '';
          if (fileName === 'main.tsx' || fileName === 'App.tsx') {
            needsIndexHtmlUpdate = true;
            newEntryFile = fileName === 'main.tsx' ? '/src/main.tsx' : null;
          }
        }

        // ALSO handle reverse: when .jsx files are written, delete conflicting .tsx template files
        for (const jsxFile of jsxFiles) {
          const tsxPath = jsxFile.path.replace(/\.jsx$/, '.tsx');
          const normalizedTsxPath = tsxPath.startsWith('src/') ? tsxPath : 'src/' + tsxPath;
          const normalizedJsxPath = jsxFile.path.startsWith('src/') ? jsxFile.path : 'src/' + jsxFile.path;

          // Check if the .tsx version exists in tracked files OR in global.existingFiles
          const tsxExists = global.existingFiles.has(normalizedTsxPath) ||
                           global.existingFiles.has(tsxPath) ||
                           jsxFilesToDelete.some(f => f.endsWith('.tsx'));

          // Also always delete main.tsx and App.tsx when writing .jsx equivalents
          // because the sandbox template uses .tsx files
          const fileName = jsxFile.path.split('/').pop() || '';
          const isEntryFile = fileName === 'main.jsx' || fileName === 'App.jsx';

          if (tsxExists || isEntryFile) {
            tsxFilesToDelete.push(normalizedTsxPath);
            console.log(`[apply-ai-code-stream] Will delete conflicting .tsx template file: ${normalizedTsxPath} (replacing with ${normalizedJsxPath})`);
          }

          // Check if this is the main entry file (App.jsx or main.jsx)
          if (isEntryFile) {
            needsIndexHtmlUpdate = true;
            // Only set newEntryFile for main.jsx (not App.jsx)
            if (fileName === 'main.jsx') {
              newEntryFile = 'src/main.jsx';
            }
          }
        }

        // Delete conflicting .jsx files before writing new files
        if (jsxFilesToDelete.length > 0) {
          await sendProgress({
            type: 'info',
            message: `Cleaning up ${jsxFilesToDelete.length} conflicting JavaScript files...`
          });

          for (const jsxFile of jsxFilesToDelete) {
            try {
              await providerInstance.runCommand(`rm -f ${jsxFile}`);
              global.existingFiles.delete(jsxFile);
              console.log(`[apply-ai-code-stream] Deleted conflicting file: ${jsxFile}`);
            } catch (err) {
              console.warn(`[apply-ai-code-stream] Failed to delete ${jsxFile}:`, err);
            }
          }
        }

        // Delete conflicting .tsx template files when writing .jsx
        if (tsxFilesToDelete.length > 0) {
          await sendProgress({
            type: 'info',
            message: `Cleaning up ${tsxFilesToDelete.length} conflicting TypeScript template files...`
          });

          for (const tsxFile of tsxFilesToDelete) {
            try {
              await providerInstance.runCommand(`rm -f ${tsxFile}`);
              global.existingFiles.delete(tsxFile);
              console.log(`[apply-ai-code-stream] Deleted conflicting template file: ${tsxFile}`);
            } catch (err) {
              console.warn(`[apply-ai-code-stream] Failed to delete ${tsxFile}:`, err);
            }
          }
        }

        // Create main.jsx entry point if generated code provides App.jsx without an entry.
        // The sandbox template starts with main.tsx -> App.tsx, so replacing only App.jsx
        // requires a matching JSX entry even if main.tsx itself was not deleted.
        const hasMainJsx = filteredFiles.some(f => f.path === 'src/main.jsx' || f.path === 'main.jsx');
        const hasAppJsx = filteredFiles.some(f => f.path === 'src/App.jsx' || f.path === 'App.jsx');
        const hasMainTsx = tsxFilesToDelete.some(f => f.includes('main.tsx'));

        if ((hasMainTsx || hasAppJsx) && !hasMainJsx) {
          console.log('[apply-ai-code-stream] Creating main.jsx entry point...');
          const mainJsxContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
          try {
            await providerInstance.writeFile('src/main.jsx', mainJsxContent);
            console.log('[apply-ai-code-stream] Created src/main.jsx entry point');
            await sendProgress({
              type: 'info',
              message: 'Created main.jsx entry point'
            });
            // Add main.jsx to filtered files so it gets tracked
            filteredFiles.push({ path: 'src/main.jsx', content: mainJsxContent });
          } catch (err) {
            console.warn('[apply-ai-code-stream] Failed to create main.jsx:', err);
          }
        }

        // Update index.html to point to correct entry file if needed
        if (needsIndexHtmlUpdate || tsxFilesToDelete.length > 0) {
          try {
            const currentIndexHtml = await providerInstance.readFile('index.html');
            const updatedIndexHtml = currentIndexHtml.replace(
              /src\/(main|index)\.(jsx|tsx)/,
              'src/main.jsx'
            );

            if (updatedIndexHtml !== currentIndexHtml) {
              await providerInstance.writeFile('index.html', updatedIndexHtml);
              console.log(`[apply-ai-code-stream] Updated index.html to point to src/main.jsx`);
              await sendProgress({
                type: 'info',
                message: `Updated HTML entry point to src/main.jsx`
              });
            }
          } catch (err) {
            console.warn(`[apply-ai-code-stream] Failed to update index.html:`, err);
          }
        }

        // If Morph is enabled and we have edits, apply them before file writes
        const morphUpdatedPaths = new Set<string>();
        if (morphEnabled && morphEdits.length > 0) {
          const morphSandbox = providerInstance;
          if (!morphSandbox) {
            console.warn('[apply-ai-code-stream] No sandbox available to apply Morph edits');
            await sendProgress({ type: 'warning', message: 'No sandbox available to apply Morph edits' });
          } else {
            await sendProgress({ type: 'info', message: `Applying ${morphEdits.length} fast edits via Morph...` });
            for (const [idx, edit] of morphEdits.entries()) {
              try {
                await sendProgress({ type: 'file-progress', current: idx + 1, total: morphEdits.length, fileName: edit.targetFile, action: 'morph-applying' });
                const result = await applyMorphEditToFile({
                  sandbox: morphSandbox,
                  targetPath: edit.targetFile,
                  instructions: edit.instructions,
                  updateSnippet: edit.update
                });
                if (result.success && result.normalizedPath) {
                  console.log('[apply-ai-code-stream] Morph updated', result.normalizedPath);
                  morphUpdatedPaths.add(result.normalizedPath);
                  if (results.filesUpdated) results.filesUpdated.push(result.normalizedPath);
                  await sendProgress({ type: 'file-complete', fileName: result.normalizedPath, action: 'morph-updated' });
                } else {
                  const msg = result.error || 'Unknown Morph error';
                  console.error('[apply-ai-code-stream] Morph apply failed for', edit.targetFile, msg);
                  if (results.errors) results.errors.push(`Morph apply failed for ${edit.targetFile}: ${msg}`);
                  await sendProgress({ type: 'file-error', fileName: edit.targetFile, error: msg });
                }
              } catch (err) {
                const msg = (err as Error).message;
                console.error('[apply-ai-code-stream] Morph apply exception for', edit.targetFile, msg);
                if (results.errors) results.errors.push(`Morph apply exception for ${edit.targetFile}: ${msg}`);
                await sendProgress({ type: 'file-error', fileName: edit.targetFile, error: msg });
              }
            }
          }
        }

        // Avoid overwriting Morph-updated files in the file write loop
        if (morphUpdatedPaths.size > 0) {
          filteredFiles = filteredFiles.filter(file => {
            if (!file?.path) return true;
            let normalizedPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
            const fileName = normalizedPath.split('/').pop() || '';
            if (!normalizedPath.startsWith('src/') &&
                !normalizedPath.startsWith('public/') &&
                normalizedPath !== 'index.html' &&
                !configFiles.includes(fileName)) {
              normalizedPath = 'src/' + normalizedPath;
            }
            return !morphUpdatedPaths.has(normalizedPath);
          });
        }
        
        for (const [index, file] of filteredFiles.entries()) {
          try {
            // Send progress for each file
            await sendProgress({
              type: 'file-progress',
              current: index + 1,
              total: filteredFiles.length,
              fileName: file.path,
              action: 'creating'
            });

            // Normalize the file path
            let normalizedPath = file.path;
            if (normalizedPath.startsWith('/')) {
              normalizedPath = normalizedPath.substring(1);
            }
            if (!normalizedPath.startsWith('src/') &&
              !normalizedPath.startsWith('public/') &&
              normalizedPath !== 'index.html' &&
              !configFiles.includes(normalizedPath.split('/').pop() || '')) {
              normalizedPath = 'src/' + normalizedPath;
            }

            const isUpdate = global.existingFiles.has(normalizedPath);

            // Keep CSS imports - they are needed for custom styles alongside Tailwind
            let fileContent = file.content;

            // Sanitize lucide-react imports so invalid icon names don't crash Vite
            fileContent = sanitizeLucideImports(fileContent);
            if (normalizedPath.endsWith('.jsx')) {
              fileContent = sanitizeJsxTypeScriptSyntax(fileContent);
            }

            // Fix common Tailwind CSS errors in CSS files
            if (file.path.endsWith('.css')) {
              // Replace shadow-3xl with shadow-2xl (shadow-3xl doesn't exist)
              fileContent = fileContent.replace(/shadow-3xl/g, 'shadow-2xl');
              // Replace any other non-existent shadow utilities
              fileContent = fileContent.replace(/shadow-4xl/g, 'shadow-2xl');
              fileContent = fileContent.replace(/shadow-5xl/g, 'shadow-2xl');

              // Ensure src/index.css always has Tailwind directives at the top
              if (normalizedPath === 'src/index.css' && !fileContent.includes('@tailwind')) {
                fileContent = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n` + fileContent;
              }
            }

            // Create directory if needed
            const dirPath = normalizedPath.includes('/') ? normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) : '';
            if (dirPath) {
              await providerInstance.runCommand(`mkdir -p ${dirPath}`);
            }

            // Write the file using provider
            console.log(`[apply-ai-code-stream] DEBUG: Writing file ${normalizedPath} (${fileContent.length} chars)`);
            try {
              await providerInstance.writeFile(normalizedPath, fileContent);
              console.log(`[apply-ai-code-stream] DEBUG: Successfully wrote ${normalizedPath}`);
            } catch (writeErr) {
              console.error(`[apply-ai-code-stream] DEBUG: Failed to write ${normalizedPath}:`, writeErr);
              throw writeErr;
            }

            // Update file cache
            if (sandboxState?.fileCache) {
              sandboxState.fileCache.files[normalizedPath] = {
                content: fileContent,
                lastModified: Date.now()
              };
            }

            if (isUpdate) {
              if (results.filesUpdated) results.filesUpdated.push(normalizedPath);
            } else {
              if (results.filesCreated) results.filesCreated.push(normalizedPath);
              if (global.existingFiles) global.existingFiles.add(normalizedPath);
            }

            await sendProgress({
              type: 'file-complete',
              fileName: normalizedPath,
              action: isUpdate ? 'updated' : 'created'
            });
          } catch (error) {
            if (results.errors) {
              results.errors.push(`Failed to create ${file.path}: ${(error as Error).message}`);
            }
            await sendProgress({
              type: 'file-error',
              fileName: file.path,
              error: (error as Error).message
            });
          }
        }

        // Step 2.5: Save uploaded images to public/images directory
        if (uploadedImages && uploadedImages.length > 0) {
          await sendProgress({
            type: 'step',
            step: 2,
            message: `Saving ${uploadedImages.length} uploaded images...`
          });

          try {
            // Create public/images directory
            await providerInstance.runCommand('mkdir -p public/images');

            // Build array of image files to write
            const imageFiles: Array<{ path: string; content: Buffer }> = [];

            for (let i = 0; i < uploadedImages.length; i++) {
              const img = uploadedImages[i];
              if (img.base64) {
                const imagePath = getUploadedImageSandboxPath(img);
                const imageName = imagePath.split('/').pop() || 'uploaded-image';

                // Convert base64 to Buffer for writeFiles
                const imageBuffer = Buffer.from(img.base64, 'base64');
                imageFiles.push({ path: imagePath, content: imageBuffer });

                // Add image to file cache so it appears in code explorer
                if (sandboxState?.fileCache) {
                  sandboxState.fileCache.files[imagePath] = {
                    content: `[Binary image: ${imageName}]`,
                    lastModified: Date.now()
                  };
                }
                if (global.existingFiles) {
                  global.existingFiles.add(imagePath);
                }

                console.log(`[apply-ai-code-stream] Prepared image: ${imagePath} (${imageBuffer.length} bytes)`);
              }
            }

            // Write all images in one batch using Buffer
            if (imageFiles.length > 0) {
              console.log(`[apply-ai-code-stream] Writing ${imageFiles.length} images via writeFiles...`);
              await providerInstance.writeFiles(imageFiles);
              console.log(`[apply-ai-code-stream] Successfully wrote all images`);

              // Send progress for each image
              for (const file of imageFiles) {
                await sendProgress({
                  type: 'file-complete',
                  fileName: file.path,
                  action: 'created'
                });
              }
            }
          } catch (imageError) {
            console.error('[apply-ai-code-stream] Failed to save uploaded images:', imageError);
            await sendProgress({
              type: 'warning',
              message: `Could not save all uploaded images: ${(imageError as Error).message}`
            });
          }
        }

        // Step 3: Execute commands
        const commandsArray = Array.isArray(parsed.commands) ? parsed.commands : [];
        if (commandsArray.length > 0) {
          await sendProgress({
            type: 'step',
            step: 3,
            message: `Executing ${commandsArray.length} commands...`
          });

          for (const [index, cmd] of commandsArray.entries()) {
            try {
              await sendProgress({
                type: 'command-progress',
                current: index + 1,
                total: parsed.commands.length,
                command: cmd,
                action: 'executing'
              });

              // Use provider runCommand
              const result = await providerInstance.runCommand(cmd);

              // Get command output from provider result
              const stdout = result.stdout;
              const stderr = result.stderr;

              if (stdout) {
                await sendProgress({
                  type: 'command-output',
                  command: cmd,
                  output: stdout,
                  stream: 'stdout'
                });
              }

              if (stderr) {
                await sendProgress({
                  type: 'command-output',
                  command: cmd,
                  output: stderr,
                  stream: 'stderr'
                });
              }

              if (results.commandsExecuted) {
                results.commandsExecuted.push(cmd);
              }

              await sendProgress({
                type: 'command-complete',
                command: cmd,
                exitCode: result.exitCode,
                success: result.exitCode === 0
              });
            } catch (error) {
              if (results.errors) {
                results.errors.push(`Failed to execute ${cmd}: ${(error as Error).message}`);
              }
              await sendProgress({
                type: 'command-error',
                command: cmd,
                error: (error as Error).message
              });
            }
          }
        }

        const changedFiles = [...results.filesCreated, ...results.filesUpdated];
        const applySucceeded =
          changedFiles.length > 0 ||
          results.commandsExecuted.length > 0 ||
          results.packagesInstalled.length > 0 ||
          Boolean(uploadedImages?.length);

        console.log('[apply-ai-code-stream] DEBUG: Final results:', {
          filesCreated: results.filesCreated,
          filesUpdated: results.filesUpdated,
          errors: results.errors,
          errorCount: results.errors.length,
          applySucceeded
        });

        // Get sandbox info to send back to frontend
        const sandboxInfo = providerInstance.getSandboxInfo();
        console.log('[apply-ai-code-stream] DEBUG: Sending complete event with sandbox:', sandboxInfo);

        // Send final results with sandbox info
        await sendProgress({
          type: 'complete',
          success: applySucceeded,
          results,
          explanation: parsed.explanation,
          structure: parsed.structure,
          message: applySucceeded
            ? `Successfully applied ${changedFiles.length} files`
            : `No files were applied${results.errors.length > 0 ? `: ${results.errors[0]}` : ''}`,
          sandbox: sandboxInfo ? {
            sandboxId: sandboxId || sandboxInfo.sandboxId,
            url: sandboxInfo.url
          } : undefined
        });

        // Track applied files in conversation state
        if (global.conversationState && changedFiles.length > 0) {
          const messages = global.conversationState.context.messages;
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'user') {
              lastMessage.metadata = {
                ...lastMessage.metadata,
                editedFiles: changedFiles
              };
            }
          }

          // Track applied code in project evolution
          if (global.conversationState.context.projectEvolution) {
            global.conversationState.context.projectEvolution.majorChanges.push({
              timestamp: Date.now(),
              description: parsed.explanation || 'Code applied',
              filesAffected: changedFiles
            });
          }

          global.conversationState.lastUpdated = Date.now();
        }

      } catch (error) {
        console.error('[apply-ai-code-stream] DEBUG: Error in processing:', error);
        await sendProgress({
          type: 'error',
          error: (error as Error).message
        });
      } finally {
        await writer.close();
      }
    })(provider, request);

    // Return the stream
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Apply AI code stream error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse AI code' },
      { status: 500 }
    );
  }
}
