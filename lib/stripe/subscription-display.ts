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
      bg: 'bg-[#17130f]/5',
      border: 'border-[#261e151f]',
      text: 'text-[#5f5343]',
      gradient: 'from-[#8a7a64] to-[#5f5343]',
    },
    pro: {
      bg: 'bg-[#ff6728]/10',
      border: 'border-[#ff6728]/25',
      text: 'text-[#c14914]',
      gradient: 'from-[#ff6728] to-[#e0490f]',
    },
    plus: {
      bg: 'bg-[#8c4b26]/10',
      border: 'border-[#8c4b26]/20',
      text: 'text-[#8c4b26]',
      gradient: 'from-[#a85a2e] to-[#8c4b26]',
    },
    team: {
      bg: 'bg-[#17130f]/10',
      border: 'border-[#17130f]/20',
      text: 'text-[#17130f]',
      gradient: 'from-[#2a221a] to-[#17130f]',
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
  return colors[status] || 'text-[#5f5343]';
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
