// Shared, dependency-free heuristics for telling a real generated site apart
// from the bare Vite scaffold. Safe to import from both server and client.

// Files that exist in every fresh Vite template. A sandbox that contains only
// these has lost its real source (e.g. its ephemeral filesystem was reset).
export const TEMPLATE_ONLY_PATHS = new Set<string>([
  'src/App.tsx', 'src/App.jsx', 'src/main.tsx', 'src/main.jsx', 'src/index.css',
  'index.html', 'package.json', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js',
]);

// Normalize a stored fileCache (either `{ path: content }` or
// `{ files: { path: { content } } }`) into a flat `{ path: content }` map.
export function fileCacheToFiles(fileCache: unknown): Record<string, string> {
  if (!fileCache || typeof fileCache !== 'object') return {};
  const cache = (fileCache as { files?: unknown }).files ?? fileCache;
  if (!cache || typeof cache !== 'object') return {};
  return Object.fromEntries(
    Object.entries(cache as Record<string, unknown>)
      .map(([path, value]) => [
        path,
        typeof value === 'string' ? value : (value as { content?: string } | null)?.content ?? '',
      ])
      .filter(([, content]) => typeof content === 'string' && content.length > 0),
  ) as Record<string, string>;
}

// How many files look like real, hand-generated source (a `src/**` file that
// isn't part of the template scaffold).
export function realSourceCount(files: Record<string, string>): number {
  return Object.keys(files).filter((p) => p.startsWith('src/') && !TEMPLATE_ONLY_PATHS.has(p)).length;
}

export function hasRealSource(files: Record<string, string>): boolean {
  return realSourceCount(files) > 0;
}
