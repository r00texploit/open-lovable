import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPriceIdForTier, stripe } from '@/lib/stripe/stripe';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier, billingCycle = 'monthly' } = await req.json();

    if (!tier || !['pro', 'plus', 'team'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }

    const priceId = getPriceIdForTier(tier, billingCycle);
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for ${tier}/${billingCycle}. Check STRIPE_PRICE_${tier.toUpperCase()} env var.` },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customerId = user?.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || undefined,
      });
      customerId = customer.id;

      // Update or create subscription with customer ID
      await prisma.subscription.upsert({
        where: { userId: user!.id },
        create: {
          userId: user.id,
          stripeCustomerId: customerId,
          tier: 'free',
        },
        update: {
          stripeCustomerId: customerId,
        },
      });
    }

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/generation?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error('[stripe/checkout-session]', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
