import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { SectionHeader } from "@/components/admin/section-header";
import { AdminTable } from "@/components/admin/admin-table";
import { SearchInput } from "@/components/admin/search-input";
import { Pagination } from "@/components/admin/pagination";
import { SandboxActions } from "@/components/admin/sandbox-actions";
import { SandboxesFilter } from "@/components/admin/sandboxes-filter";
import { Suspense } from "react";
import { TableLoadingSkeleton } from "@/components/admin/admin-table";
import { ExternalLink } from "lucide-react";

const PAGE_SIZE = 25;

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

export default async function AdminSandboxesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const now = new Date();

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { sandboxId: { contains: q, mode: "insensitive" } },
      { sandboxName: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (status === "active") {
    where.status = { notIn: ["killed", "failed"] };
    where.expiresAt = { gt: now };
  } else if (status === "expired") {
    where.expiresAt = { lte: now };
  }

  const [total, sessions] = await Promise.all([
    prisma.generationSession.count({ where }),
    prisma.generationSession.findMany({
      where,
      orderBy: { lastActiveAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true, name: true } },
        site: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <SectionHeader
        title="Sandboxes & sessions"
        description={`${total.toLocaleString()} sessions${status === "active" ? " (active)" : ""}`}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Suspense fallback={<div className="h-10 flex-1" />}>
          <SearchInput placeholder="Search by sandbox id, name, or owner email…" className="flex-1" />
        </Suspense>
        <Suspense fallback={null}>
          <SandboxesFilter current={status} />
        </Suspense>
      </div>

      <Suspense fallback={<TableLoadingSkeleton />}>
        <AdminTable
          rows={sessions}
          rowKey={(s) => s.id}
          empty={
            <div className="text-center">
              <p className="text-sm text-foreground-dimmer mb-1">No sessions found</p>
              {q && <p className="text-xs text-foreground-dimmer">Try a different search term.</p>}
            </div>
          }
          columns={[
            {
              key: "site",
              header: "Site",
              cell: (s) => (
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{s.site?.name || "Untitled session"}</p>
                  <p className="text-xs text-foreground-dimmer truncate">{s.sandboxId}</p>
                </div>
              ),
            },
            {
              key: "owner",
              header: "Owner",
              cell: (s) => (
                <Link href={`/admin/users/${s.user.id}`} className="text-sm text-foreground-dimmer hover:text-heat-100 truncate">
                  {s.user.email}
                </Link>
              ),
            },
            { key: "provider", header: "Provider", cell: (s) => <span className="text-foreground-dimmer">{s.sandboxProvider}</span> },
            {
              key: "status",
              header: "Status",
              cell: (s) => {
                const expired = s.expiresAt <= now;
                const tone =
                  s.status === "killed"
                    ? "text-red-600"
                    : s.status === "creating"
                      ? "text-heat-100"
                      : expired
                        ? "text-foreground-dimmer"
                        : "text-accent-forest";
                return (
                  <span className={`text-xs font-medium capitalize ${tone}`}>
                    {s.status}
                    {expired && s.status !== "killed" ? " (expired)" : ""}
                  </span>
                );
              },
            },
            {
              key: "active",
              header: "Last active",
              className: "text-foreground-dimmer whitespace-nowrap",
              cell: (s) => timeAgo(s.lastActiveAt),
            },
            {
              key: "open",
              header: "",
              className: "w-0",
              cell: (s) =>
                s.sandboxUrl ? (
                  <a
                    href={s.sandboxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-foreground-dimmer hover:text-foreground hover:bg-background-base"
                    aria-label="Open sandbox"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null,
            },
          ]}
          actions={(s) => <SandboxActions sessionId={s.id} />}
        />
      </Suspense>

      <Suspense fallback={null}>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </>
  );
}