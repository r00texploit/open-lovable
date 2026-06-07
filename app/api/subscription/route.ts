import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { type SubscriptionTier } from '@/lib/stripe/stripe';
import { getNormalizedSubscriptionState } from '@/lib/usage/token-usage';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { subscription: true, usage: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { subscription, usage } = await getNormalizedSubscriptionState(user.id);

    const tier: SubscriptionTier = subscription.tier as SubscriptionTier;
    const status = subscription.status || 'active';
    const isSubscribed = tier !== 'free' && ['active', 'trialing'].includes(status);

    return NextResponse.json({
      tier,
      status,
      currentPeriodEnd: subscription.currentPeriodEnd || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      usage: {
        used: usage.generationsUsed,
        limit: usage.generationsLimit,
        unit: 'tokens',
        period: 'month',
      },
      isSubscribed,
      stripeCustomerId: subscription.stripeCustomerId || null,
    });
  } catch (error) {
    console.error('[subscription]', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}
