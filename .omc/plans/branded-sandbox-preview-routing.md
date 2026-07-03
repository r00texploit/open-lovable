# Durable Branded Sandbox Preview Routing

## Summary

Build `slug.{ROOT_DOMAIN}` as a branded HTTP preview URL for active Vercel sandboxes, while keeping user custom domains published-only. The raw `*.vercel.run` sandbox URL remains the execution target; the branded subdomain routes through the Next app and proxies to that raw URL.

Sandboxes should feel "always available" to users, but Vercel does not support a single running sandbox session forever. Vercel Sandbox sessions have plan limits: Hobby is capped at 45 minutes, and Pro/Enterprise are capped at 24 hours. The durable model is named persistent sandboxes: the session can stop, Vercel snapshots the filesystem, and the app resumes the sandbox on demand.

References:
- https://vercel.com/docs/sandbox/pricing
- https://vercel.com/docs/sandbox/sdk-reference
- https://vercel.com/docs/sandbox/concepts/persistent-sandboxes
- https://vercel.com/docs/sandbox/concepts/snapshots

## Key Changes

- Add host-routing middleware that rewrites tenant subdomain requests to the existing `site-host` route.
  - Exclude root domain, `www`, `PLATFORM_APP_HOST`, local dev hosts, `/api`, `/_next`, and static assets.
  - Use existing `ROOT_DOMAIN` / `NEXT_PUBLIC_ROOT_DOMAIN` helpers, not hardcoded `noeron.net`.

- Persist active sandbox preview state in `GenerationSession`.
  - Add a dedicated raw sandbox URL field, e.g. `rawSandboxUrl String?`, leaving `sandboxUrl` / returned `previewUrl` free for display-facing URLs.
  - Add persistent sandbox metadata fields: `sandboxName String?`, `sandboxRuntimeStatus String?`, and optionally `currentSnapshotId String?` if exposed by the upgraded SDK.
  - On sandbox creation or resume, store `rawSandboxUrl = sandbox.domain(devPort)` and return both:
    - `url`: raw Vercel sandbox URL
    - `previewUrl`: `https://{site.subdomain}.{ROOT_DOMAIN}` when a site is attached
  - Remove dependency on the in-memory `previewMappings` map for production routing; it can be deleted or kept only as a non-authoritative local fallback.

- Upgrade `@vercel/sandbox` from `0.0.24` to the current SDK line that supports named persistent sandbox APIs such as `Sandbox.getOrCreate`, `name`, `snapshotExpiration`, `keepLastSnapshots`, `onCreate`, `onResume`, and `resume`.

- Replace plain `Sandbox.create` with named persistent sandbox lifecycle.
  - Sandbox name format: `site-${siteId}-session-${sessionId}` for site-attached sessions, otherwise `session-${sessionId}`.
  - Use `Sandbox.getOrCreate({ name, runtime, ports, timeout, snapshotExpiration: 0, keepLastSnapshots: { count: 1 }, resume: true })`.
  - `onCreate`: set up the Vite React app once.
  - `onResume`: restart `npm run dev` detached and wait until the configured port responds.
  - Keep the current keepalive endpoint, but treat it as "keep active while editing," not "run forever."

- Update tenant serving behavior.
  - For `slug.{ROOT_DOMAIN}`, look up the `Site` by subdomain.
  - If a recent/resumable `GenerationSession` exists for that site, ensure the persistent sandbox is running, refresh `rawSandboxUrl`, then proxy HTTP requests to it.
  - If resume is still in progress, return a lightweight "Preview waking up" response or retry-friendly 503.
  - Otherwise, serve the published snapshot as today.
  - For custom domains, do not proxy active sandbox previews; only serve published snapshots.

- Update UI/session consumers.
  - Replace hardcoded `https://${subdomain}.noeron.net` with env-derived tenant URL logic.
  - Session listing/status endpoints should expose `previewUrl` separately from raw sandbox URL so the builder can show branded URLs without losing the real sandbox target.
  - Messaging should say previews may wake/resume, not that the same running VM is active forever.

## API / Schema Impact

- Prisma migration:
  - `GenerationSession.rawSandboxUrl String?`
  - `GenerationSession.sandboxName String? @unique`
  - `GenerationSession.sandboxRuntimeStatus String?`
  - Optional `GenerationSession.currentSnapshotId String?`
  - Optional index on `siteId, lastActiveAt` for efficient lookup of the latest site session.

- API responses from sandbox/session endpoints should consistently include:
  - `url`: raw sandbox URL
  - `previewUrl`: branded tenant URL when available
  - `sandboxName`: stable persistent sandbox name
  - `sandboxId`, `provider`, `siteSlug` unchanged

## Test Plan

- Unit/static checks:
  - Hostname helpers correctly classify root, app host, tenant subdomain, custom domain, and local dev.
  - Tenant URL generation uses env vars.
  - Persistent sandbox names are deterministic and unique.

- Sandbox lifecycle:
  - Creating a site-attached sandbox uses `getOrCreate`, stores `sandboxName`, `rawSandboxUrl`, and `previewUrl`.
  - Reopening a stopped persistent sandbox resumes it and restarts Vite.
  - The keepalive endpoint extends active editing sessions up to Vercel plan limits and reports when the limit is reached.

- Route behavior:
  - `slug.{ROOT_DOMAIN}/` rewrites to `site-host` and proxies to `rawSandboxUrl` when the sandbox is running.
  - `slug.{ROOT_DOMAIN}/assets/x.js` proxies the matching sandbox asset path.
  - If the sandbox is stopped but resumable, the app resumes it and updates `rawSandboxUrl`.
  - If no active/resumable session exists, published assets are served.
  - If neither resumable preview nor published snapshot exists, return 404.
  - Custom domains never proxy raw sandbox previews.

- Integration/manual:
  - Create sandbox with attached site, confirm API returns raw `url` plus branded `previewUrl`.
  - Let the sandbox stop or simulate stopped state, reopen the builder or branded preview, and confirm it resumes from snapshot.
  - Visit branded subdomain on deployed Vercel environment and confirm page/assets render.
  - Confirm builder still works if using raw sandbox URL for editing refresh/HMR reliability.

## Assumptions

- "Active forever" means always recoverable/resumable, not one VM running without timeout.
- Branded preview is HTTP page/assets preview only; full Vite HMR/WebSocket proxying is out of scope for this pass.
- Platform tenant subdomains are enabled by adding `*.{ROOT_DOMAIN}` once to the Vercel Project.
- User custom domains remain published-only for stability.
- `ROOT_DOMAIN`, `NEXT_PUBLIC_ROOT_DOMAIN`, and `PLATFORM_APP_HOST` are the source of truth for generated URLs.
