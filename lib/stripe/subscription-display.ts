import { type SubscriptionTier } from './stripe';

export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: 'Free',
    pro: 'Pro',
    plus: 'Plus',
    team: 'Team',
  };
  return names[tier] || 'Free';
}

export function getTierColor(tier: SubscriptionTier): {
  bg: string;
  border: string;
  text: string;
  gradient: string;
} {
  const colors: Record<SubscriptionTier, { bg: string; border: string; text: string; gradient: string }> = {
    free: {
      bg: 'bg-warm-800/5',
      border: 'border-warm-750/12',
      text: 'text-warm-500',
      gradient: 'from-warm-350 to-warm-500',
    },
    pro: {
      bg: 'bg-brand-orange/10',
      border: 'border-brand-orange/25',
      text: 'text-heat-110',
      gradient: 'from-brand-orange to-brand-orange-dark',
    },
    plus: {
      bg: 'bg-warm-600/10',
      border: 'border-warm-600/20',
      text: 'text-warm-600',
      gradient: 'from-warm-600 to-warm-600',
    },
    team: {
      bg: 'bg-warm-800/10',
      border: 'border-warm-800/20',
      text: 'text-warm-800',
      gradient: 'from-warm-700 to-warm-800',
    },
  };
  return colors[tier] || colors.free;
}

export function getStatusColor(status: string): string {
  // Shades dark enough to stay readable on the cream backgrounds
  const colors: Record<string, string> = {
    active: 'text-green-700',
    trialing: 'text-blue-700',
    past_due: 'text-yellow-700',
    canceled: 'text-red-700',
    unpaid: 'text-red-700',
    paused: 'text-orange-700',
  };
  return colors[status] || 'text-warm-500';
}

export function formatSubscriptionStatus(status: string): string {
  const names: Record<string, string> = {
    active: 'Active',
    trialing: 'Trialing',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    paused: 'Paused',
  };
  return names[status] || status;
}

export function getNextResetTime(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const diff = nextMonth.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h`;
}
