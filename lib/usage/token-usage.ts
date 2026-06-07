import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getTokenLimitForTier, type SubscriptionTier } from '@/lib/stripe/stripe';

type Db = PrismaClient | typeof prisma;

// More accurate constants for token estimation
export const TOKEN_USAGE_FALLBACK = 1000; // Reduced from 4000 - minimum charge for any request
export const CHARS_PER_TOKEN = 3.8; // Better average for code (was 4)
export const CODE_CHARS_PER_TOKEN = 3.5; // Code is more token-efficient
export const NATURAL_CHARS_PER_TOKEN = 4.0; // Natural language is less efficient

/**
 * Smart token estimation based on content type
 * Code is more token-efficient than natural language
 */
export function estimateTokensFromText(...parts: Array<string | null | undefined>): number {
  if (!parts.length) return TOKEN_USAGE_FALLBACK;

  let totalTokens = 0;

  for (const part of parts) {
    if (!part) continue;

    const length = part.length;
    if (length === 0) continue;

    // Detect if content is code-heavy
    const isCode = detectCodeContent(part);
    const ratio = isCode ? CODE_CHARS_PER_TOKEN : NATURAL_CHARS_PER_TOKEN;

    // Estimate tokens for this part
    const tokens = Math.ceil(length / ratio);
    totalTokens += tokens;
  }

  // Apply minimum for overhead (system prompt, formatting, etc)
  return Math.max(TOKEN_USAGE_FALLBACK, totalTokens);
}

/**
 * Detect if content is primarily code
 */
function detectCodeContent(text: string): boolean {
  // Code indicators
  const codePatterns = [
    /\b(function|const|let|var|class|import|export|return|if|else|for|while)\b/,
    /[{}();<>]/g,
    /\b(src|app|components|lib|utils)\b/,
    /\.(tsx?|jsx?|css|html|json|py|rs|go)\b/,
    /<\/?[A-Z][a-zA-Z]*\s*\/?>/, // JSX tags
  ];

  let matches = 0;
  for (const pattern of codePatterns) {
    if (pattern.test(text)) matches++;
  }

  // If 2+ patterns match, consider it code
  return matches >= 2;
}

/**
 * Extract actual token usage from AI provider response
 * Supports multiple provider formats
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function extractTokenUsage(usage: unknown): TokenUsage | null {
  if (!usage || typeof usage !== 'object') return null;

  const candidate = usage as {
    promptTokens?: unknown;
    completionTokens?: unknown;
    totalTokens?: unknown;
    inputTokens?: unknown;
    outputTokens?: unknown;
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };

  // Try to extract prompt tokens (input)
  let promptTokens = 0;
  if (typeof candidate.promptTokens === 'number') {
    promptTokens = candidate.promptTokens;
  } else if (typeof candidate.inputTokens === 'number') {
    promptTokens = candidate.inputTokens;
  } else if (typeof candidate.prompt_tokens === 'number') {
    promptTokens = candidate.prompt_tokens;
  }

  // Try to extract completion tokens (output)
  let completionTokens = 0;
  if (typeof candidate.completionTokens === 'number') {
    completionTokens = candidate.completionTokens;
  } else if (typeof candidate.outputTokens === 'number') {
    completionTokens = candidate.outputTokens;
  } else if (typeof candidate.completion_tokens === 'number') {
    completionTokens = candidate.completion_tokens;
  }

  // Try to extract total tokens
  let totalTokens = 0;
  if (typeof candidate.totalTokens === 'number') {
    totalTokens = candidate.totalTokens;
  } else if (typeof candidate.total_tokens === 'number') {
    totalTokens = candidate.total_tokens;
  }

  // If we have no valid data, return null
  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) {
    return null;
  }

  // Calculate total if not provided
  if (totalTokens === 0 && (promptTokens > 0 || completionTokens > 0)) {
    totalTokens = promptTokens + completionTokens;
  }

  // Ensure all values are at least 1 if any value exists
  if (totalTokens > 0) {
    return {
      promptTokens: Math.max(1, Math.ceil(promptTokens)),
      completionTokens: Math.max(1, Math.ceil(completionTokens)),
      totalTokens: Math.max(1, Math.ceil(totalTokens)),
    };
  }

  return null;
}

/**
 * @deprecated Use extractTokenUsage instead
 * Fallback function for backwards compatibility
 */
export function getUsageTokenCount(usage: unknown, fallback: number): number {
  const extracted = extractTokenUsage(usage);
  if (extracted) {
    return extracted.totalTokens;
  }
  return Math.max(1, Math.ceil(fallback));
}

/**
 * Calculate tokens for a generation request
 * This is the main entry point for token calculation
 */
export function calculateGenerationTokens(
  prompt: string,
  generatedCode: string,
  context?: {
    files?: string[];
    structure?: string;
  }
): { estimated: number; breakdown: string } {
  // Input tokens (prompt + context)
  const inputEstimate = estimateTokensFromText(
    prompt,
    context?.structure,
    context?.files?.join('\n')
  );

  // Output tokens (generated code)
  const outputEstimate = estimateTokensFromText(generatedCode);

  // Total with small overhead for formatting
  const total = inputEstimate + outputEstimate;

  const breakdown = `Input: ~${inputEstimate.toLocaleString()} tokens | Output: ~${outputEstimate.toLocaleString()} tokens | Total: ~${total.toLocaleString()} tokens`;

  return { estimated: total, breakdown };
}

// ===== Database Operations =====

export function shouldResetMonthly(resetDate: Date, now = new Date()) {
  return (
    now.getUTCFullYear() !== resetDate.getUTCFullYear() ||
    now.getUTCMonth() !== resetDate.getUTCMonth()
  );
}

export async function ensureFreeEntitlements(userId: string, db: Db = prisma) {
  const tokenLimit = getTokenLimitForTier('free');

  const [subscription, usage] = await db.$transaction([
    db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: 'free',
        status: 'active',
      },
      update: {},
    }),
    db.usage.upsert({
      where: { userId },
      create: {
        userId,
        generationsUsed: 0,
        generationsLimit: tokenLimit,
        resetDate: new Date(),
      },
      update: {},
    }),
  ]);

  return { subscription, usage };
}

export async function getNormalizedUsageForUser(userId: string, tier?: string | null, db: Db = prisma) {
  const effectiveTier = (tier || 'free') as SubscriptionTier;
  const tokenLimit = getTokenLimitForTier(effectiveTier);
  const now = new Date();
  const existingUsage = await db.usage.findUnique({ where: { userId } });

  if (!existingUsage) {
    return db.usage.create({
      data: {
        userId,
        generationsUsed: 0,
        generationsLimit: tokenLimit,
        resetDate: now,
      },
    });
  }

  const reset = shouldResetMonthly(existingUsage.resetDate, now);
  if (reset || existingUsage.generationsLimit !== tokenLimit) {
    return db.usage.update({
      where: { userId },
      data: {
        generationsUsed: reset ? 0 : existingUsage.generationsUsed,
        generationsLimit: tokenLimit,
        resetDate: reset ? now : existingUsage.resetDate,
      },
    });
  }

  return existingUsage;
}

export async function getNormalizedSubscriptionState(userId: string, db: Db = prisma) {
  const { subscription } = await ensureFreeEntitlements(userId, db);
  const usage = await getNormalizedUsageForUser(userId, subscription.tier, db);
  return { subscription, usage };
}

export async function assertTokenAllowance(userId: string, requestedTokens = 1, db: Db = prisma) {
  const { subscription } = await ensureFreeEntitlements(userId, db);
  const usage = await getNormalizedUsageForUser(userId, subscription.tier, db);
  const remaining = usage.generationsLimit - usage.generationsUsed;

  if (remaining < requestedTokens) {
    return {
      allowed: false as const,
      subscription,
      usage,
      remaining,
    };
  }

  return {
    allowed: true as const,
    subscription,
    usage,
    remaining,
  };
}

/**
 * Increment token usage with detailed tracking
 */
export async function incrementTokenUsage(
  userId: string,
  tokens: number,
  db: Db = prisma
) {
  // Ensure minimum charge for any request (to prevent abuse)
  const requestedTokens = Math.max(TOKEN_USAGE_FALLBACK, Math.ceil(tokens));
  const allowance = await assertTokenAllowance(userId, requestedTokens, db);

  if (!allowance.allowed) {
    return allowance;
  }

  const usage = await db.usage.update({
    where: { userId },
    data: { generationsUsed: { increment: requestedTokens } },
  });

  return {
    allowed: true as const,
    subscription: allowance.subscription,
    usage,
    remaining: usage.generationsLimit - usage.generationsUsed,
    charged: requestedTokens,
  };
}
