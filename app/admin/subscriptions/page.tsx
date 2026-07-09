import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { TIERS, formatTokenAmount, type SubscriptionTier } from "@/lib/stripe/stripe";
import { SectionHeader } from "@/components/admin/section-header";
import { AdminTable } from "@/components/admin/admin-table";
import { SearchInput } from "@/components/admin/search-input";
import { Pagination } from "@/components/admin/pagination";
import { SubscriptionsFilter } from "@/components/admin/subscriptions-filter";
import { SubscriptionActions } from "@/components/admin/subscription-actions";
import { BadgeTier, BadgeStatus } from "@/components/admin/badge-tier";
import { StatCard } from "@/components/admin/stat-card";
import { Suspense } from "react";
import { TableLoadingSkeleton } from "@/components/admin/admin-table";
import { CreditCard, Users, TrendingUp, CalendarClock } from "lucide-react";

const PAGE_SIZE = 25;
const VALID_TIERS: SubscriptionTier[] = ["free", "pro", "plus", "team"];
const VALID_STATUSES = ["active", "trialing", "past_due", "canceled", "unpaid", "paused", "inactive"];

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const tier = typeof sp.tier === "string" ? sp.tier : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { stripeCustomerId: { contains: q, mode: "insensitive" } },
      { stripeSubscriptionId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (tier && tier !== "all" && VALID_TIERS.includes(tier as SubscriptionTier)) where.tier = tier;
  if (status && status !== "all" && VALID_STATUSES.includes(status)) where.status = status;

  const [total, subscriptions, payingCounts, recurringCount] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            usage: { select: { generationsUsed: true, generationsLimit: true } },
          },
        },
      },
    }),
    prisma.subscription.groupBy({
      by: ["tier"],
      where: { status: { in: ["active", "trialing"] }, cancelAtPeriodEnd: false },
      _count: { _all: true },
    }),
    prisma.subscription.count({
      where: { status: { in: ["active", "trialing"] }, cancelAtPeriodEnd: true },
    }),
  ]);

  // MRR = active/trialing, non-scheduled-cancel, by tier price.
  let totalMrr = 0;
  const perTierCount: Record<string, number> = { free: 0, pro: 0, plus: 0, team: 0 };
  for (const row of payingCounts) {
    const t = row.tier as SubscriptionTier;
    if (!perTierCount[t]) continue;
    perTierCount[t] = row._count._all;
    totalMrr += row._count._all * (TIERS[t]?.price || 0);
  }
  const payingTotal = Object.values(perTierCount).reduce((s, n) => s + n, 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <SectionHeader title="Subscriptions" description={`${total.toLocaleString()} total subscription records`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Paying" value={payingTotal.toLocaleString()} icon={CreditCard} tone="accent" />
        <StatCard label="Est. MRR" value={`$${totalMrr.toLocaleString()}/mo`} icon={TrendingUp} />
        <StatCard label="Scheduled to cancel" value={recurringCount.toLocaleString()} icon={CalendarClock} />
        <StatCard
          label="Plan mix"
          value={`P${perTierCount.pro} · +${perTierCount.plus} · T${perTierCount.team}`}
          icon={Users}
        />
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <Suspense fallback={<div className="h-10" />}>
          <SearchInput placeholder="Search by email, name, Stripe customer/subscription id…" />
        </Suspense>
        <Suspense fallback={null}>
          <SubscriptionsFilter currentTier={tier} currentStatus={status} />
        </Suspense>
      </div>

      <Suspense fallback={<TableLoadingSkeleton />}>
        <AdminTable
          rows={subscriptions}
          rowKey={(s) => s.id}
          empty={
            <div className="text-center">
              <p className="text-sm text-foreground-dimmer mb-1">No subscriptions found</p>
              {q && <p className="text-xs text-foreground-dimmer">Try a different search term.</p>}
            </div>
          }
          columns={[
            {
              key: "user",
              header: "User",
              cell: (s) => (
                <div className="min-w-0">
                  <Link href={`/admin/users/${s.user.id}`} className="font-medium text-foreground truncate hover:text-heat-100">
                    {s.user.name || s.user.email}
                  </Link>
                  <p className="text-xs text-foreground-dimmer truncate">{s.user.email}</p>
                </div>
              ),
            },
            {
              key: "tier",
              header: "Plan",
              cell: (s) => <BadgeTier tier={s.tier} />,
            },
            {
              key: "status",
              header: "Status",
              cell: (s) => (
                <div className="flex items-center gap-2">
                  <BadgeStatus status={s.status} />
                  {s.cancelAtPeriodEnd && s.status !== "canceled" && (
                    <span className="text-xs text-foreground-dimmer">cancels</span>
                  )}
                </div>
              ),
            },
            {
              key: "period",
              header: "Period end",
              className: "text-foreground-dimmer whitespace-nowrap",
              cell: (s) => fmtDate(s.currentPeriodEnd),
            },
            {
              key: "usage",
              header: "Token usage",
              cell: (s) => {
                const used = s.user.usage?.generationsUsed || 0;
                const limit = s.user.usage?.generationsLimit || 0;
                return (
                  <span className="text-xs text-foreground tabular-nums">
                    {formatTokenAmount(used)} / {formatTokenAmount(limit)}
                  </span>
                );
              },
            },
            {
              key: "stripe",
              header: "Stripe sub",
              cell: (s) =>
                s.stripeSubscriptionId ? (
                  <span className="text-xs text-foreground-dimmer font-mono truncate max-w-[140px] inline-block">
                    {s.stripeSubscriptionId.slice(-12)}
                  </span>
                ) : (
                  <span className="text-xs text-foreground-dimmer">—</span>
                ),
            },
          ]}
          actions={(s) => (
            <SubscriptionActions
              subscriptionId={s.id}
              status={s.status}
              cancelAtPeriodEnd={s.cancelAtPeriodEnd}
              hasStripeId={Boolean(s.stripeSubscriptionId)}
            />
          )}
        />
      </Suspense>

      <Suspense fallback={null}>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </>
  );
}