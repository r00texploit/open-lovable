import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';
import {
  syncSubscriptionFromStripe,
  cancelSubscriptionInStripe,
  uncancelSubscriptionInStripe,
} from '@/lib/stripe/admin-actions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!subscription) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  return NextResponse.json({ subscription });
}

/**
 * Admin mutations on a subscription. All Stripe-backed actions require a
 * stripeSubscriptionId; DB-only tier overrides live on /api/admin/users/[id].
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  const existing = await prisma.subscription.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  try {
    if (action === 'sync') {
      const updated = await syncSubscriptionFromStripe(id);
      return NextResponse.json({ ok: true, subscription: updated });
    }

    if (action === 'cancel') {
      const immediately = body?.immediately === true;
      const updated = await cancelSubscriptionInStripe(id, immediately);
      return NextResponse.json({
        ok: true,
        subscription: updated,
        message: immediately ? 'Subscription canceled immediately' : 'Subscription scheduled to cancel at period end',
      });
    }

    if (action === 'uncancel') {
      const updated = await uncancelSubscriptionInStripe(id);
      return NextResponse.json({ ok: true, subscription: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe action failed';
    // Distinguish "not configured / not found" from genuine server errors.
    const status =
      message.includes('not configured') || message.includes('no Stripe subscription id')
        ? 400
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}