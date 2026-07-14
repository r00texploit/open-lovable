# Plan: Per-site GitHub connection and sync

## Goal
Finish the "sync" half of the per-site GitHub integration. The connection/auth half is already implemented (OAuth flow, encrypted token vault, settings UI, push/pull API routes, and schema/migration). This plan adds automatic push-after-apply and manual sync controls in the builder.

## Current state
- `prisma/schema.prisma` + migration: `GitHubConnection` table with encrypted `accessToken` per site.
- `lib/github/github-client.ts`: OAuth helpers, token seal/unseal, repo create/read, file push/pull.
- `app/api/github/{connect,callback,status,disconnect,push,pull}/route.ts`: full OAuth lifecycle and sync endpoints.
- `app/settings/page.tsx`: GitHub tab lists sites and lets users connect/disconnect per site.
- `app/generation/page.tsx`: site selector + publish actions, but no GitHub sync UI.
- `app/api/apply-ai-code-stream/route.ts`: applies code and persists the file cache, but does not sync to GitHub.

## Missing work
1. **Auto-push after code apply** — when `apply-ai-code-stream` succeeds, best-effort push only the changed files to the connected GitHub repo without blocking the response.
2. **Push scoped to changed files** — current `/api/github/push` pushes every sandbox file. Auto-push should send only files created/updated in this apply.
3. **Builder GitHub sync panel** — add a compact control in the generation page site action bar showing:
   - connection status for the active site,
   - a "Connect GitHub" button when disconnected,
   - "Push" and "Pull" buttons when connected,
   - inline success/error/loading feedback.

## Implementation approach

### Server
1. **`lib/github/github-client.ts`**: add `pushSiteChanges(token, owner, repo, branch, files, message)` that pushes an arbitrary map of repo-relative path → content. The existing `pushFiles` already does this; expose a thin wrapper that derives the default repo name `noeron-{siteSlug}` and owner from the connected GitHub user, so callers don't repeat that logic.
2. **`app/api/github/push/route.ts`**: accept an optional `files` body field (`Record<string, string>`). If provided, push only those files; otherwise fall back to the current "list all sandbox files" behavior. Keep backward compatibility for manual full pushes.
3. **`app/api/apply-ai-code-stream/route.ts`**: after sending the `complete` SSE event and persisting the file cache, if the session has a `siteId`, spawn a non-blocking background task that:
   - loads the GitHub connection for the site,
   - gathers the set of changed files (`filesCreated` + `filesUpdated`) from the apply results,
   - reads each changed file from the live sandbox,
   - calls the push helper with commit message `Apply from Noeron — {siteName}`,
   - logs the result; never throws back into the stream.

### Client
4. **`app/generation/page.tsx`**:
   - Add state: `githubStatus` for the active site, `githubActionLoading` for push/pull, `githubStatusMessage` for feedback.
   - Fetch `/api/github/status?siteId={activeSiteId}` whenever the active site changes and update `githubStatus`.
   - Add a `GitHubSyncBar` subcomponent in the site action bar (next to publish/unpublish) with:
     - disconnected: "Connect GitHub" button linking to `/api/github/connect?siteId={...}`,
     - connected: push/pull icon buttons and a small "Connected as {login}" label,
     - loading spinner during push/pull,
     - status message below the bar on success/error.
   - Implement `pushToGitHub()` and `pullFromGitHub()` handlers calling `/api/github/push` and `/api/github/pull` with `siteId` and `sandboxId`. After pull, refresh the sandbox preview and file list.

## Files to modify
- `lib/github/github-client.ts`
- `app/api/github/push/route.ts`
- `app/api/apply-ai-code-stream/route.ts`
- `app/generation/page.tsx`

## Out of scope
- Bidirectional webhooks or background sync jobs.
- Auto-pull on sandbox resume (risk of overwriting uncommitted local edits; keep pull manual for now).
- Org/repo selection beyond the default `noeron-{slug}` repo under the connected user.

## Verification
- `npm run build` passes.
- `npm run lint` passes.
- Manual UI check: connect a site, apply code, see auto-push log, use manual Pull, verify buttons and status messages render on desktop and mobile widths.
