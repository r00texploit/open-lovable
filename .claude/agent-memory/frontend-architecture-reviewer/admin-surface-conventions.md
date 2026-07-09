---
name: admin-surface-conventions
description: Admin surface architecture — server-component pages + Prisma, client islands via URL params, auth defense-in-depth
metadata:
  type: project
---

The /admin surface (added ~2026-07) uses a server-component-first pattern distinct from the rest of the app.

- Admin list/detail pages (app/admin/**) are Server Components reading `searchParams` + Prisma directly; no client-side fetch, no TanStack Query.
- Client islands (SearchInput, Pagination, filters, action buttons, ConfirmAction) sync state to URL searchParams via `router.replace`, then `router.refresh()` after mutations — server re-renders with fresh data.
- Auth defense-in-depth: proxy.ts (JWT role, fast edge reject) → layout.tsx (getServerSession + DB role) → API routes (requireAdminOr403 → DB role check).
- `requireAdminOr403` returns `AdminAuth | NextResponse`; callers check `auth instanceof NextResponse`. Existing `requireUser` returns `{session,user}|null` and callers build the 401 themselves — two different ergonomics for the same concern.
- Shared utils reused correctly: `toSiteDto`, `TIERS`, `formatTokenAmount`, `getTierDisplayName/getTierColor`, `getNormalizedSubscriptionState`.
- `timeAgo` is NOT shared — duplicated across 5 files (app/sites, app/admin/page, users, sites, sandboxes).
- The rest of the app (app/sites, app/settings) uses client components + useSession + fetch — the admin surface is intentionally more server-heavy, which is correct.