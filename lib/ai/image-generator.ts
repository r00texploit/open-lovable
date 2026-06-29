// Finds [IMG: description] markers in generated code and replaces them with AI-generated image URLs.
// Falls back to picsum.photos if generation fails.

const IMG_MARKER_RE = /\[IMG:\s*([^\]]+)\]/g;
const FALLBACK_URL = 'https://picsum.photos/1200/600';
const MAX_CONCURRENT = 4;

async function generateImage(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/generate-ai-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '1792x1024' }),
    });
    if (!res.ok) return FALLBACK_URL;
    const data = await res.json();
    return data.success && data.url ? data.url : FALLBACK_URL;
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
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let done = 0;

  for (let i = 0; i < markers.length; i += MAX_CONCURRENT) {
    const batch = markers.slice(i, i + MAX_CONCURRENT);
    const urls = await Promise.all(batch.map((m) => generateImage(m)));
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
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const markers = extractMarkers(rawCode);
  if (markers.length === 0) return rawCode;

  const map = await buildImageMap(markers, onProgress);
  return replaceMarkers(rawCode, map);
}
