// Pure, dependency-free detection/redaction of AI provider API keys.
// Safe to import from both server and client (no prisma / node-only imports).

export type AiProvider = 'openai' | 'anthropic';

// Broad matcher for provider keys embedded anywhere in free text.
const KEY_RE = /\bsk-(?:ant-)?(?:proj-)?[A-Za-z0-9_-]{20,}\b/g;

export function detectProviderFromKey(key: string): AiProvider | null {
  const trimmed = key.trim();
  if (/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(trimmed)) return 'anthropic';
  // OpenAI: classic `sk-...` and project `sk-proj-...` keys.
  if (/^sk-(proj-)?[A-Za-z0-9_-]{20,}$/.test(trimmed)) return 'openai';
  return null;
}

// Find unique provider keys in a string, with their detected provider.
export function findApiKeysInText(text: string): Array<{ key: string; provider: AiProvider }> {
  if (!text) return [];
  const found = new Map<string, AiProvider>();
  let match: RegExpExecArray | null;
  const re = new RegExp(KEY_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    const provider = detectProviderFromKey(match[0]);
    if (provider) found.set(match[0], provider);
  }
  return Array.from(found, ([key, provider]) => ({ key, provider }));
}

export function last4(key: string): string {
  return key.trim().slice(-4);
}

// Replace every detected key with a masked placeholder so no raw secret leaks
// into chat history, logs, or the model prompt.
export function redactApiKeys(text: string): string {
  if (!text) return text;
  return text.replace(new RegExp(KEY_RE.source, 'g'), (m) => {
    const provider = detectProviderFromKey(m);
    if (!provider) return m;
    return `[${provider} key •••${last4(m)} — stored securely]`;
  });
}

export function containsApiKey(text: string): boolean {
  return findApiKeysInText(text).length > 0;
}
