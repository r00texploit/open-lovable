import Stripe from 'stripe';

// Lazy initialization - only create Stripe instance when needed server-side
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2026-05-27.dahlia',
    });
  }
  return stripeInstance;
}

// Export a proxy object that lazily initializes Stripe on first use
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    const s = getStripe();
    return (s as any)[prop];
  }
});

export const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO!,
  plus: process.env.STRIPE_PRICE_PLUS!,
  team: process.env.STRIPE_PRICE_TEAM!,
};

export type SubscriptionTier = 'free' | 'pro' | 'plus' | 'team';

export const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    tokens: 50000,
    features: ['50K tokens per month', 'Basic styles', 'Community support'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    tokens: 500000,
    features: ['500K tokens per month', 'All styles', 'Priority support', 'Export code'],
  },
  plus: {
    name: 'Plus',
    price: 49,
    tokens: 1500000,
    features: ['1.5M tokens per month', 'All styles', 'Priority support', 'Export code', 'API access'],
  },
  team: {
    name: 'Team',
    price: 99,
    tokens: 5000000,
    features: ['5M tokens per month', 'All styles', 'Team collaboration', 'Priority support', 'API access', 'Custom integrations'],
  },
};

export function getPriceIdForTier(tier: string): string | null {
  if (tier !== 'pro' && tier !== 'plus' && tier !== 'team') return null;
  return STRIPE_PRICE_IDS[tier] || null;
}

export function getTierForPriceId(priceId?: string | null): SubscriptionTier {
  if (priceId && STRIPE_PRICE_IDS.pro && priceId === STRIPE_PRICE_IDS.pro) {
    return 'pro';
  }
  if (priceId && STRIPE_PRICE_IDS.plus && priceId === STRIPE_PRICE_IDS.plus) {
    return 'plus';
  }
  if (priceId && STRIPE_PRICE_IDS.team && priceId === STRIPE_PRICE_IDS.team) {
    return 'team';
  }
  return 'free';
}

export function getGenerationLimitForTier(tier: string): number {
  return getTokenLimitForTier(tier);
}

export function getTokenLimitForTier(tier: string): number {
  if (tier === 'pro') return TIERS.pro.tokens;
  if (tier === 'plus') return TIERS.plus.tokens;
  if (tier === 'team') return TIERS.team.tokens;
  return TIERS.free.tokens;
}

export function formatTokenAmount(tokens: number): string {
  if (tokens >= 1000000) {
    return `${tokens / 1000000}M`;
  }
  if (tokens >= 1000) {
    return `${tokens / 1000}K`;
  }
  return `${tokens}`;
}
