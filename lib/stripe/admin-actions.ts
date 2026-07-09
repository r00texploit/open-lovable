import Stripe from 'stripe';
import { stripe, getTierForPriceId, getTokenLimitForTier, type SubscriptionTier } from '@/lib/stripe/stripe';
import { prisma } from '@/lib/db/prisma';

/**
 * Admin-only Stripe subscription actions. These mirror the mapping logic in
 * app/api/stripe/webhook/route.ts (tier/price/period extraction) so the DB
 * stays consistent with however the webhook would have recorded the same
 * Stripe event. Every function hits the live Stripe API — callers must be
 * admin-guarded and confirm before destructive calls.
 */

function getSubscriptionItem(subscription: Stripe.Subscription) {
  return subscription.items.data[0];
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return getSubscriptionItem(subscription)?.price?.id || null;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnd = getSubscriptionItem(subscription)?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000) : null;
}

function getTierFromSubscription(subscription: Stripe.Subscription): SubscriptionTier {
  const metadataTier = subscription.metadata?.tier;
  if (metadataTier === 'pro' || metadataTier === 'plus' || metadataTier === 'team') {
    return metadataTier;
  }
  return getTierForPriceId(getSubscriptionPriceId(subscription));
}

async function updateUsageLimit(userId: string, tier: string) {
  await prisma.usage.upsert({
    where: { userId },
    create: {
      userId,
      generationsUsed: 0,
      generationsLimit: getTokenLimitForTier(tier),
      resetDate: new Date(),
    },
    update: {
      generationsLimit: getTokenLimitForTier(tier),
    },
  });
}

/**
 * Pull the live state of a Stripe subscription into the DB. Useful when a
 * webhook was missed or to verify Stripe is the source of truth. Returns the
 * updated DB row. Throws if Stripe is not configured or the subscription has
 * no Stripe id / can't be found.
 */
export async function syncSubscriptionFromStripe(dbSubscriptionId: string) {
  const dbSub = await prisma.subscription.findUnique({ where: { id: dbSubscriptionId } });
  if (!dbSub) throw new Error('Subscription not found');
  if (!dbSub.stripeSubscriptionId) {
    throw new Error('This subscription has no Stripe subscription id to sync');
  }

  const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripeSubscriptionId, {
    expand: ['items.data.price'],
  });

  const tier =
    stripeSub.status === 'canceled' ? 'free' : getTierFromSubscription(stripeSub);
  const priceId = getSubscriptionPriceId(stripeSub);
  const currentPeriodEnd = getSubscriptionPeriodEnd(stripeSub);

  const updated = await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: stripeSub.status,
      tier,
      stripePriceId: priceId,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    },
  });

  await updateUsageLimit(dbSub.userId, tier);
  return updated;
}

/**
 * Cancel a Stripe subscription. If `immediately` is true, the subscription is
 * deleted (status → canceled, tier → free). Otherwise it's scheduled to cancel
 * at the end of the current period (cancel_at_period_end = true).
 */
export async function cancelSubscriptionInStripe(
  dbSubscriptionId: string,
  immediately: boolean,
) {
  const dbSub = await prisma.subscription.findUnique({ where: { id: dbSubscriptionId } });
  if (!dbSub) throw new Error('Subscription not found');
  if (!dbSub.stripeSubscriptionId) {
    throw new Error('This subscription has no Stripe subscription id to cancel');
  }

  if (immediately) {
    const canceled = await stripe.subscriptions.cancel(dbSub.stripeSubscriptionId);
    const updated = await prisma.subscription.update({
      where: { id: dbSub.id },
      data: {
        status: canceled.status,
        tier: 'free',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: getSubscriptionPeriodEnd(canceled),
      },
    });
    await updateUsageLimit(dbSub.userId, 'free');
    return updated;
  }

  const scheduled = await stripe.subscriptions.update(dbSub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  return prisma.subscription.update({
    where: { id: dbSub.id },
    data: { cancelAtPeriodEnd: true, status: scheduled.status },
  });
}

/**
 * Reverse a scheduled cancellation (cancel_at_period_end = false).
 */
export async function uncancelSubscriptionInStripe(dbSubscriptionId: string) {
  const dbSub = await prisma.subscription.findUnique({ where: { id: dbSubscriptionId } });
  if (!dbSub) throw new Error('Subscription not found');
  if (!dbSub.stripeSubscriptionId) {
    throw new Error('This subscription has no Stripe subscription id');
  }

  const resumed = await stripe.subscriptions.update(dbSub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
  return prisma.subscription.update({
    where: { id: dbSub.id },
    data: { cancelAtPeriodEnd: false, status: resumed.status },
  });
}