import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/stripe';
import { prisma } from '@/lib/db/prisma';
import {
  getTokenLimitForTier,
  getTierForPriceId,
  type SubscriptionTier,
} from '@/lib/stripe/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parent = invoice.parent;
  if (parent?.type !== 'subscription_details') return null;

  const subscription = parent.subscription_details?.subscription;
  return typeof subscription === 'string' ? subscription : subscription?.id || null;
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

async function retrieveSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
}

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error('[stripe/webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[stripe/webhook] Event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const stripeSubscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!userId || !stripeSubscriptionId) {
          throw new Error('Missing user or subscription on checkout session');
        }

        const subscription = await retrieveSubscription(stripeSubscriptionId);
        const priceId = getSubscriptionPriceId(subscription);
        const tier = getTierFromSubscription(subscription);
        const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId,
            stripePriceId: priceId,
            status: 'active',
            tier,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
          update: {
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId,
            stripePriceId: priceId,
            status: subscription.status,
            tier,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });

        await updateUsageLimit(userId, tier);

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (!subscriptionId) break;

        const stripeSubscription = await retrieveSubscription(subscriptionId);
        const priceId = getSubscriptionPriceId(stripeSubscription);
        const tier = getTierFromSubscription(stripeSubscription);
        const currentPeriodEnd = getSubscriptionPeriodEnd(stripeSubscription);

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: stripeSubscription.status,
              stripePriceId: priceId,
              tier,
              currentPeriodEnd,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
          });
          await updateUsageLimit(subscription.userId, tier);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = getSubscriptionPriceId(subscription);
        const tier = event.type === 'customer.subscription.deleted'
          ? 'free'
          : getTierFromSubscription(subscription);
        const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);

        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: subscription.status,
              tier,
              stripePriceId: priceId,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd,
            },
          });
          await updateUsageLimit(dbSubscription.userId, tier);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe/webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
