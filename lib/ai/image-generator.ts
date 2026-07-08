// Finds [IMG: description] markers in generated code and replaces them with AI-generated image URLs.
// Falls back to picsum.photos if generation fails.

const IMG_MARKER_RE = /\[IMG:\s*([^\]]+)\]/g;
const FALLBACK_URL = 'https://picsum.photos/1200/600';
const MAX_CONCURRENT = 4;

async function generateImage(prompt: string, sandboxId: string): Promise<string> {
  try {
    const res = await fetch('/api/generate-ai-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '1536x1024', sandboxId }),
    });
    if (!res.ok) return FALLBACK_URL;
    const data = await res.json();
    // API now persists the image into the sandbox and returns a stable local
    // path (e.g. /generated/ai-xxxx.webp); fall back to `url` for older shapes.
    const resolved = data.success ? (data.path || data.url) : null;
    return resolved || FALLBACK_URL;
  } catch {
    return FALLBACK_URL;
  }
}

// Extract unique [IMG: ...] markers from a code string
function extractMarkers(code: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(IMG_MARKER_RE.source, 'g');
  while ((match = re.exec(code)) !== null) {
    found.add(match[1].trim());
  }
  return Array.from(found);
}

// Generate images for all markers in batches, return prompt→url map
async function buildImageMap(
  markers: string[],
  sandboxId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let done = 0;

  for (let i = 0; i < markers.length; i += MAX_CONCURRENT) {
    const batch = markers.slice(i, i + MAX_CONCURRENT);
    const urls = await Promise.all(batch.map((m) => generateImage(m, sandboxId)));
    batch.forEach((marker, idx) => {
      map.set(marker, urls[idx]);
      done++;
      onProgress?.(done, markers.length);
    });
  }

  return map;
}

// Replace all [IMG: ...] markers in a code string using the map
function replaceMarkers(code: string, map: Map<string, string>): string {
  return code.replace(new RegExp(IMG_MARKER_RE.source, 'g'), (_full, desc: string) => {
    return map.get(desc.trim()) ?? FALLBACK_URL;
  });
}

// Main entry: process the full streamed code block (the raw string with <file> tags)
export async function processGeneratedCodeForImages(
  rawCode: string,
  sandboxId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const markers = extractMarkers(rawCode);
  if (markers.length === 0) return rawCode;
  // Without a sandbox to persist into we can't produce durable image paths;
  // swap markers for the fallback so no literal [IMG: ...] leaks into src.
  if (!sandboxId) {
    return replaceMarkers(rawCode, new Map());
  }

  const map = await buildImageMap(markers, sandboxId, onProgress);
  return replaceMarkers(rawCode, map);
}
