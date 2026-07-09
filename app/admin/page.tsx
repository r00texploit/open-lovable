import { prisma } from "@/lib/db/prisma";
import { TIERS } from "@/lib/stripe/stripe";
import { formatTokenAmount } from "@/lib/stripe/stripe";
import { SectionHeader } from "@/components/admin/section-header";
import { StatCard } from "@/components/admin/stat-card";
import { MiniBarChart } from "@/components/admin/charts";
import { Users, Globe, Server, CreditCard, Zap, TrendingUp } from "lucide-react";
import Link from "next/link";
import { BadgeTier } from "@/components/admin/badge-tier";

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function AdminOverviewPage() {
  const now = new Date();

  const [
    totalUsers,
    totalSites,
    publishedSites,
    activeSandboxes,
    activeSubRows,
    usageRows,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.site.count(),
    prisma.site.count({ where: { published: true } }),
    prisma.generationSession.count({
      where: { status: { not: "killed" }, expiresAt: { gt: now } },
    }),
    prisma.subscription.findMany({
      where: { tier: { not: "free" }, status: { in: ["active", "trialing"] } },
      select: { tier: true },
    }),
    prisma.usage.findMany({ select: { generationsUsed: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, email: true, name: true, createdAt: true, subscription: { select: { tier: true } } },
    }),
  ]);

  const totalTokensUsed = usageRows.reduce((s, u) => s + (u.generationsUsed || 0), 0);
  const mrr = activeSubRows.reduce((s, r) => s + (TIERS[r.tier as keyof typeof TIERS]?.price || 0), 0);

  // 30-day signups time series.
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  const from30 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  const signups = await prisma.user.findMany({
    where: { createdAt: { gte: from30 } },
    select: { createdAt: true },
  });
  for (const u of signups) {
    const key = u.createdAt.toISOString().slice(0, 10);
    const bucket = days.find((d) => d.date === key);
    if (bucket) bucket.count += 1;
  }
  const signups30d = signups.length;

  return (
    <>
      <SectionHeader
        title="Overview"
        description="Platform health at a glance."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total users" value={totalUsers.toLocaleString()} icon={Users} tone="accent" hint={`${signups30d} new in last 30 days`} />
        <StatCard label="Total sites" value={totalSites.toLocaleString()} icon={Globe} hint={`${publishedSites.toLocaleString()} published`} />
        <StatCard label="Active sandboxes" value={activeSandboxes.toLocaleString()} icon={Server} tone="success" />
        <StatCard label="Paying subscribers" value={activeSubRows.length.toLocaleString()} icon={CreditCard} />
        <StatCard label="Est. MRR" value={`$${mrr.toLocaleString()}/mo`} icon={TrendingUp} />
        <StatCard label="Tokens used (all-time)" value={formatTokenAmount(totalTokensUsed)} icon={Zap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Signups chart */}
        <div className="lg:col-span-2 bg-background-lighter rounded-2xl border border-border-faint p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Signups — last 30 days</h2>
              <p className="text-xs text-foreground-dimmer mt-0.5">{signups30d} new users</p>
            </div>
          </div>
          <MiniBarChart data={days} />
        </div>

        {/* Recent signups */}
        <div className="bg-background-lighter rounded-2xl border border-border-faint p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent signups</h2>
          {recentSignups.length === 0 ? (
            <p className="text-xs text-foreground-dimmer">No users yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentSignups.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate group-hover:text-heat-100">
                        {u.name || u.email}
                      </p>
                      <p className="text-xs text-foreground-dimmer truncate">{u.email}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <BadgeTier tier={u.subscription?.tier || "free"} />
                      <span className="text-[10px] text-foreground-dimmer">{timeAgo(u.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}