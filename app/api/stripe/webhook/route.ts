import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';
import { prisma } from '@/lib/db/prisma';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event;

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
        const session = event.data.object as any;
        const userId = session.metadata.userId;
        const tier = session.metadata.tier;

        await prisma.subscription.update({
          where: { userId },
          data: {
            stripeSubscriptionId: session.subscription,
            stripePriceId: session.line_items?.data[0]?.price?.id,
            status: 'active',
            tier: tier,
            currentPeriodEnd: new Date(session.expires_at * 1000),
          },
        });

        // Update usage limits based on tier
        const limits: Record<string, number> = { free: 3, pro: 100, team: 500 };
        await prisma.usage.update({
          where: { userId },
          data: { generationsLimit: limits[tier] || 3 },
        });

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'active',
              currentPeriodEnd: new Date(invoice.period_end * 1000),
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;

        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: subscription.status === 'canceled' ? 'canceled' : subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
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
