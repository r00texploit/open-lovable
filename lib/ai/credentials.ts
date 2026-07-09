import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { encryptSecret, decryptSecret } from '@/lib/crypto/secret-box';
import { detectProviderFromKey, last4, type AiProvider } from '@/lib/ai/api-key-detection';

export type { AiProvider } from '@/lib/ai/api-key-detection';
export { detectProviderFromKey, findApiKeysInText } from '@/lib/ai/api-key-detection';

export interface MaskedCredential {
  id: string;
  provider: AiProvider;
  siteId: string | null;
  last4: string;
  revoked: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export function maskKey(key: string): string {
  return last4(key);
}

function toMasked(row: {
  id: string;
  provider: string;
  siteId: string | null;
  last4: string;
  revoked: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}): MaskedCredential {
  return {
    id: row.id,
    provider: row.provider as AiProvider,
    siteId: row.siteId,
    last4: row.last4,
    revoked: row.revoked,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  };
}

/**
 * Encrypt and store (or replace) a user's API key for a provider/site. Never
 * returns the raw key. Re-storing for the same (user, provider, site) rotates
 * the ciphertext but keeps a stable proxyToken so already-generated sites keep
 * working.
 */
export async function storeCredential(params: {
  userId: string;
  apiKey: string;
  provider?: AiProvider;
  siteId?: string | null;
}): Promise<MaskedCredential & { proxyToken: string }> {
  const provider = params.provider ?? detectProviderFromKey(params.apiKey) ?? 'openai';
  const siteId = params.siteId ?? null;
  const sealed = encryptSecret(params.apiKey.trim());
  const last4 = maskKey(params.apiKey);

  // findFirst (not findUnique) because a nullable siteId can't be used in a
  // compound-unique lookup — SQL treats NULLs as distinct.
  const existing = await prisma.aiCredential.findFirst({
    where: { userId: params.userId, provider, siteId },
  });

  const row = existing
    ? await prisma.aiCredential.update({
        where: { id: existing.id },
        data: {
          last4,
          ciphertext: sealed.ciphertext,
          iv: sealed.iv,
          authTag: sealed.authTag,
          revoked: false,
        },
      })
    : await prisma.aiCredential.create({
        data: {
          userId: params.userId,
          siteId,
          provider,
          last4,
          ciphertext: sealed.ciphertext,
          iv: sealed.iv,
          authTag: sealed.authTag,
          proxyToken: `pk_${randomBytes(24).toString('hex')}`,
          revoked: false,
        },
      });

  return { ...toMasked(row), proxyToken: row.proxyToken };
}

export async function listCredentials(userId: string): Promise<MaskedCredential[]> {
  const rows = await prisma.aiCredential.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toMasked);
}

export async function revokeCredential(userId: string, id: string): Promise<boolean> {
  const result = await prisma.aiCredential.updateMany({
    where: { id, userId },
    data: { revoked: true },
  });
  return result.count > 0;
}

// Choose the proxy token a generated site should use: a site-specific key wins,
// otherwise fall back to the user's account-wide (siteId=null) default.
export async function getProxyTokenForSite(
  userId: string,
  siteId: string | null,
  provider: AiProvider = 'openai',
): Promise<string | null> {
  const rows = await prisma.aiCredential.findMany({
    where: {
      userId,
      provider,
      revoked: false,
      OR: [{ siteId }, { siteId: null }],
    },
  });
  if (rows.length === 0) return null;
  const siteSpecific = rows.find((r) => r.siteId === siteId);
  return (siteSpecific ?? rows[0]).proxyToken;
}

/**
 * Server-only: resolve a proxy token to its decrypted key. Used by the runtime
 * proxy endpoint. Updates lastUsedAt. Returns null for unknown/revoked tokens.
 */
export async function resolveProxyToken(
  proxyToken: string,
): Promise<{ apiKey: string; provider: AiProvider; userId: string } | null> {
  const row = await prisma.aiCredential.findUnique({ where: { proxyToken } });
  if (!row || row.revoked) return null;

  let apiKey: string;
  try {
    apiKey = decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag });
  } catch {
    return null;
  }

  await prisma.aiCredential.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });

  return { apiKey, provider: row.provider as AiProvider, userId: row.userId };
}
