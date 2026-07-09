import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatTokenAmount } from "@/lib/stripe/stripe";
import { BadgeTier, BadgeStatus } from "@/components/admin/badge-tier";
import { UserActions } from "@/components/admin/user-actions";
import { AdminTable } from "@/components/admin/admin-table";
import { ArrowLeft, Mail, Calendar, Globe, Server } from "lucide-react";
import { toSiteDto } from "@/lib/tenancy/site-dto";

function fmtDate(d: Date) {
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      subscription: true,
      usage: true,
      _count: { select: { sites: true, generationSessions: true, generations: true } },
    },
  });
  if (!user) notFound();

  const [sites, sessions] = await Promise.all([
    prisma.site.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.generationSession.findMany({
      where: { userId: id },
      orderBy: { lastActiveAt: "desc" },
      take: 10,
      select: {
        id: true,
        sandboxId: true,
        status: true,
        sandboxProvider: true,
        sandboxUrl: true,
        lastActiveAt: true,
        expiresAt: true,
        site: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  const used = user.usage?.generationsUsed || 0;
  const limit = user.usage?.generationsLimit || 0;

  return (
    <>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-foreground-dimmer hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile + actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-background-lighter rounded-2xl border border-border-faint p-5">
            <div className="flex items-center gap-3">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name || ""} className="h-12 w-12 rounded-full" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-heat-8 flex items-center justify-center text-heat-100 font-semibold">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">{user.name || "(no name)"}</h1>
                <p className="text-sm text-foreground-dimmer truncate flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-foreground-dimmer">Role</dt>
                <dd className="text-foreground font-medium capitalize">{user.role}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-foreground-dimmer">Plan</dt>
                <dd><BadgeTier tier={user.subscription?.tier || "free"} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-foreground-dimmer">Status</dt>
                <dd><BadgeStatus status={user.subscription?.status || "inactive"} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-foreground-dimmer flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined</dt>
                <dd className="text-foreground">{fmtDate(user.createdAt)}</dd>
              </div>
            </dl>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-background-base p-2">
                <p className="text-lg font-bold text-foreground tabular-nums">{user._count.sites}</p>
                <p className="text-[10px] text-foreground-dimmer uppercase">Sites</p>
              </div>
              <div className="rounded-lg bg-background-base p-2">
                <p className="text-lg font-bold text-foreground tabular-nums">{user._count.generationSessions}</p>
                <p className="text-[10px] text-foreground-dimmer uppercase">Sessions</p>
              </div>
              <div className="rounded-lg bg-background-base p-2">
                <p className="text-lg font-bold text-foreground tabular-nums">{user._count.generations}</p>
                <p className="text-[10px] text-foreground-dimmer uppercase">Gens</p>
              </div>
            </div>
          </div>

          <UserActions
            userId={user.id}
            currentTier={user.subscription?.tier || "free"}
            usageUsed={used}
            usageLimit={limit}
          />
        </div>

        {/* Sites + sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-foreground-dimmer" /> Sites
            </h2>
            <AdminTable
              rows={sites}
              rowKey={(s) => s.id}
              empty={<p className="text-sm text-foreground-dimmer">No sites yet.</p>}
              columns={[
                { key: "name", header: "Name", cell: (s) => <span className="font-medium text-foreground">{s.name}</span> },
                { key: "slug", header: "Slug", cell: (s) => <span className="text-foreground-dimmer">{s.slug}</span> },
                {
                  key: "status",
                  header: "Status",
                  cell: (s) => (
                    <span className={`text-xs font-medium ${s.published ? "text-accent-forest" : "text-foreground-dimmer"}`}>
                      {s.published ? "Published" : "Draft"}
                    </span>
                  ),
                },
                { key: "url", header: "Live URL", cell: (s) => <span className="text-xs text-foreground-dimmer truncate">{toSiteDto(s).liveUrl}</span> },
              ]}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Server className="h-4 w-4 text-foreground-dimmer" /> Recent sessions
            </h2>
            <AdminTable
              rows={sessions}
              rowKey={(s) => s.id}
              empty={<p className="text-sm text-foreground-dimmer">No sessions yet.</p>}
              columns={[
                { key: "site", header: "Site", cell: (s) => <span className="text-foreground">{s.site?.name || "—"}</span> },
                { key: "provider", header: "Provider", cell: (s) => <span className="text-foreground-dimmer">{s.sandboxProvider}</span> },
                {
                  key: "status",
                  header: "Status",
                  cell: (s) => {
                    const expired = s.expiresAt <= new Date();
                    const tone = s.status === "killed" ? "text-red-600" : expired ? "text-foreground-dimmer" : "text-accent-forest";
                    return <span className={`text-xs font-medium capitalize ${tone}`}>{s.status}{expired && s.status !== "killed" ? " (expired)" : ""}</span>;
                  },
                },
                {
                  key: "active",
                  header: "Last active",
                  className: "text-foreground-dimmer whitespace-nowrap",
                  cell: (s) => fmtDate(s.lastActiveAt),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}