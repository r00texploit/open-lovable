import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { toSiteDto } from "@/lib/tenancy/site-dto";
import { SectionHeader } from "@/components/admin/section-header";
import { AdminTable } from "@/components/admin/admin-table";
import { SearchInput } from "@/components/admin/search-input";
import { Pagination } from "@/components/admin/pagination";
import { SiteActions } from "@/components/admin/site-actions";
import { SitesFilter } from "@/components/admin/sites-filter";
import { Suspense } from "react";
import { TableLoadingSkeleton } from "@/components/admin/admin-table";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

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

export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const published = typeof sp.published === "string" ? sp.published : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { customDomain: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (published === "true") where.published = true;
  if (published === "false") where.published = false;

  const [total, sites] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { assets: true } },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <SectionHeader title="Sites" description={`${total.toLocaleString()} total sites`} />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Suspense fallback={<div className="h-10 flex-1" />}>
          <SearchInput placeholder="Search by name, slug, domain, or owner email…" className="flex-1" />
        </Suspense>
        <Suspense fallback={null}>
          <SitesFilter current={published} />
        </Suspense>
      </div>

      <Suspense fallback={<TableLoadingSkeleton />}>
        <AdminTable
          rows={sites}
          rowKey={(s) => s.id}
          empty={
            <div className="text-center">
              <p className="text-sm text-foreground-dimmer mb-1">No sites found</p>
              {q && <p className="text-xs text-foreground-dimmer">Try a different search term.</p>}
            </div>
          }
          columns={[
            {
              key: "name",
              header: "Site",
              cell: (s) => (
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-foreground-dimmer truncate">{s.slug}</p>
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
            {
              key: "domain",
              header: "Domain",
              cell: (s) => (
                <span className="text-xs text-foreground-dimmer truncate">
                  {s.customDomain || toSiteDto(s).liveUrl}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (s) => (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.published ? "text-accent-forest" : "text-foreground-dimmer"}`}>
                  {s.published ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  {s.published ? "Live" : "Draft"}
                </span>
              ),
            },
            {
              key: "assets",
              header: "Assets",
              className: "tabular-nums text-foreground-dimmer",
              cell: (s) => s._count.assets,
            },
            {
              key: "created",
              header: "Created",
              className: "text-foreground-dimmer whitespace-nowrap",
              cell: (s) => timeAgo(s.createdAt),
            },
            {
              key: "open",
              header: "",
              className: "w-0",
              cell: (s) =>
                s.published ? (
                  <a
                    href={toSiteDto(s).liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-foreground-dimmer hover:text-foreground hover:bg-background-base"
                    aria-label="Open site"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null,
            },
          ]}
          actions={(s) => <SiteActions siteId={s.id} published={s.published} />}
        />
      </Suspense>

      <Suspense fallback={null}>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </>
  );
}