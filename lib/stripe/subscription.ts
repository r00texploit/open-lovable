import { prisma } from '@/lib/db/prisma';
import { getNormalizedSubscriptionState } from '@/lib/usage/token-usage';
import { type SubscriptionTier } from './stripe';
export {
  formatSubscriptionStatus,
  getNextResetTime,
  getStatusColor,
  getTierColor,
  getTierDisplayName,
} from './subscription-display';

export interface SubscriptionData {
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid' | 'paused';
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    used: number;
    limit: number;
  };
  isSubscribed: boolean;
}

export async function getUserSubscription(userId: string): Promise<SubscriptionData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const { subscription, usage } = await getNormalizedSubscriptionState(user.id);
  const tier: SubscriptionTier = (subscription.tier as SubscriptionTier) || 'free';
  const status = (subscription.status as SubscriptionData['status']) || 'active';
  const isSubscribed = tier !== 'free' && ['active', 'trialing'].includes(status);

  return {
    tier,
    status,
    currentPeriodEnd: subscription.currentPeriodEnd || null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
    usage: {
      used: usage.generationsUsed,
      limit: usage.generationsLimit,
    },
    isSubscribed,
  };
}
