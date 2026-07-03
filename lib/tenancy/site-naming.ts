const BUSINESS_SUFFIXES = new Set([
  'com',
  'net',
  'org',
  'io',
  'ai',
  'app',
  'co',
  'dev',
  'site',
  'www',
]);

const LEADING_PROMPT_WORDS =
  /^(?:build|create|make|design|generate|clone|recreate|a|an|the|website|site|landing|page|app|for)\s+/i;

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cleanupName(value: string) {
  return value
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/\s+(?:website|site|landing page|app|application|homepage)$/i, '')
    .trim();
}

function nameFromUrl(value: string) {
  try {
    const url = new URL(value.match(/^https?:\/\//i) ? value : `https://${value}`);
    const labels = url.hostname.split('.').filter(Boolean);
    const label = labels.find((part) => !BUSINESS_SUFFIXES.has(part.toLowerCase())) || labels[0];
    return label ? titleCase(label.replace(/[-_]+/g, ' ')) : null;
  } catch {
    return null;
  }
}

export function extractSiteNameFromPrompt(input: {
  prompt?: string | null;
  sourceUrl?: string | null;
}) {
  const prompt = input.prompt?.trim() || '';

  const quoted = prompt.match(/["'`]([^"'`]{2,80})["'`]/);
  if (quoted?.[1]) {
    return cleanupName(quoted[1]);
  }

  const namedMatch = prompt.match(
    /\b(?:called|named|for|brand(?:ed)? as|company called|startup called)\s+([A-Z0-9][A-Za-z0-9&'. -]{1,80})/i
  );
  if (namedMatch?.[1]) {
    return cleanupName(namedMatch[1].split(/[,.!?;:]/)[0]);
  }

  const urlName = input.sourceUrl ? nameFromUrl(input.sourceUrl) : null;
  if (urlName) {
    return cleanupName(urlName);
  }

  const compactPrompt = prompt
    .replace(LEADING_PROMPT_WORDS, '')
    .split(/[,.!?;:]/)[0]
    .slice(0, 80)
    .trim();

  return cleanupName(compactPrompt) || 'Untitled Site';
}

export function slugifySiteName(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 50)
    .replace(/-+$/g, '');

  if (slug.length >= 3) {
    return slug;
  }

  return `${slug || 'site'}-site`.slice(0, 50).replace(/-+$/g, '');
}
