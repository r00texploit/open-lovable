import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Authenticated symmetric encryption for secrets at rest (e.g. user-supplied
 * AI provider API keys). AES-256-GCM with a random 96-bit IV per message.
 *
 * The master key comes from SECRETS_ENCRYPTION_KEY and must be 32 bytes,
 * supplied as 64 hex chars or 44-char base64. We fail closed: if the key is
 * missing or malformed, encryption/decryption throw rather than silently
 * storing or returning plaintext.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export interface SealedSecret {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

function loadMasterKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw || !raw.trim()) {
    throw new Error('SECRETS_ENCRYPTION_KEY is not set; refusing to handle secrets');
  }
  const trimmed = raw.trim();

  // Accept hex (64 chars) or base64 (any length that decodes to 32 bytes).
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    key = Buffer.from(trimmed, 'hex');
  } else {
    key = Buffer.from(trimmed, 'base64');
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `SECRETS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}); use 64 hex chars or 32-byte base64`,
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): SealedSecret {
  const key = loadMasterKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptSecret(sealed: SealedSecret): string {
  const key = loadMasterKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(sealed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(sealed.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** True when a usable master key is configured, without throwing. */
export function isSecretVaultConfigured(): boolean {
  try {
    loadMasterKey();
    return true;
  } catch {
    return false;
  }
}
