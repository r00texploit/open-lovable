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
      bg: 'bg-gray-500/20',
      border: 'border-gray-500/30',
      text: 'text-gray-300',
      gradient: 'from-gray-500 to-gray-600',
    },
    pro: {
      bg: 'bg-violet-500/20',
      border: 'border-violet-500/30',
      text: 'text-violet-300',
      gradient: 'from-violet-500 to-violet-600',
    },
    plus: {
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/30',
      text: 'text-orange-300',
      gradient: 'from-orange-500 to-orange-600',
    },
    team: {
      bg: 'bg-fuchsia-500/20',
      border: 'border-fuchsia-500/30',
      text: 'text-fuchsia-300',
      gradient: 'from-fuchsia-500 to-fuchsia-600',
    },
  };
  return colors[tier] || colors.free;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-400',
    trialing: 'text-blue-400',
    past_due: 'text-yellow-400',
    canceled: 'text-red-400',
    unpaid: 'text-red-400',
    paused: 'text-orange-400',
  };
  return colors[status] || 'text-gray-400';
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
