import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatTokenAmount } from "@/lib/stripe/stripe";
import { SectionHeader } from "@/components/admin/section-header";
import { AdminTable } from "@/components/admin/admin-table";
import { SearchInput } from "@/components/admin/search-input";
import { Pagination } from "@/components/admin/pagination";
import { BadgeTier, BadgeStatus } from "@/components/admin/badge-tier";
import { Suspense } from "react";
import { TableLoadingSkeleton } from "@/components/admin/admin-table";
import { ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const tier = typeof sp.tier === "string" ? sp.tier : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (tier && tier !== "all") where.subscription = { tier };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        subscription: { select: { tier: true, status: true } },
        usage: { select: { generationsUsed: true, generationsLimit: true } },
        _count: { select: { sites: true, generationSessions: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <SectionHeader title="Users" description={`${total.toLocaleString()} total users`} />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Suspense fallback={<div className="h-10 flex-1" />}>
          <SearchInput placeholder="Search by email or name…" className="flex-1" />
        </Suspense>
      </div>

      <Suspense fallback={<TableLoadingSkeleton />}>
        <AdminTable
          rows={users}
          rowKey={(u) => u.id}
          empty={
            <div className="text-center">
              <p className="text-sm text-foreground-dimmer mb-1">No users found</p>
              {q && <p className="text-xs text-foreground-dimmer">Try a different search term.</p>}
            </div>
          }
          columns={[
            {
              key: "user",
              header: "User",
              cell: (u) => (
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{u.name || "(no name)"}</p>
                  <p className="text-xs text-foreground-dimmer truncate">{u.email}</p>
                </div>
              ),
            },
            {
              key: "tier",
              header: "Plan",
              cell: (u) => (
                <div className="flex items-center gap-2">
                  <BadgeTier tier={u.subscription?.tier || "free"} />
                  {u.subscription?.status && u.subscription.status !== "active" && (
                    <BadgeStatus status={u.subscription.status} />
                  )}
                </div>
              ),
            },
            {
              key: "usage",
              header: "Token usage",
              cell: (u) => {
                const used = u.usage?.generationsUsed || 0;
                const limit = u.usage?.generationsLimit || 0;
                const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                return (
                  <div className="min-w-[120px]">
                    <p className="text-xs text-foreground tabular-nums">
                      {formatTokenAmount(used)} / {formatTokenAmount(limit)}
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-background-base mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-heat-100" : "bg-accent-forest"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              },
            },
            {
              key: "sites",
              header: "Sites",
              className: "tabular-nums text-foreground-dimmer",
              cell: (u) => u._count.sites,
            },
            {
              key: "sessions",
              header: "Sessions",
              className: "tabular-nums text-foreground-dimmer",
              cell: (u) => u._count.generationSessions,
            },
            {
              key: "created",
              header: "Joined",
              className: "text-foreground-dimmer whitespace-nowrap",
              cell: (u) => timeAgo(u.createdAt),
            },
          ]}
          actions={(u) => (
            <Link
              href={`/admin/users/${u.id}`}
              className="inline-flex items-center gap-1 text-xs text-foreground-dimmer hover:text-heat-100"
            >
              Manage
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        />
      </Suspense>

      <Suspense fallback={null}>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </>
  );
}