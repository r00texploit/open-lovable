# Plan: Replace Vercel Sandboxes / Domain Deployment with a VPS

## Goals

1. Stop using `@vercel/sandbox` for live preview sandboxes.
2. Stop using the Vercel Project API for custom-domain registration.
3. Run both live sandboxes and published static site builds on a self-managed VPS.
4. Let the VPS handle subdomain creation/routing and TLS termination (via the user’s existing nginx/traefik).

## Current state (key files)

- `lib/sandbox/providers/vercel-provider.ts` — the active sandbox provider (uses `@vercel/sandbox`).
- `lib/sandbox/providers/base-provider.ts` / `lib/sandbox/types.ts` — clean provider abstraction we can extend.
- `lib/sandbox/factory.ts` — picks `vercel` or `e2b` via `SANDBOX_PROVIDER`; we add `vps`.
- `lib/vercel.ts` — adds/removes custom domains via `api.vercel.com`.
- `app/api/create-ai-sandbox-v2/route.ts` and `app/api/sandboxes/route.ts` — create/reconnect/delete sandboxes.
- `app/site-host/[host]/[[...asset]]/route.ts` — serves published snapshots and proxies live sandbox previews.
- `lib/tenancy/preview-mapping.ts` — in-memory map of `subdomain -> raw sandbox URL`.
- `lib/tenancy/hostname.ts` — treats `.vercel.app` / `.vercel-dns.com` as platform hostnames.
- `prisma/schema.prisma` — `GenerationSession` tracks `sandboxProvider`, `sandboxUrl`, `rawSandboxUrl`, `sandboxName`, etc.

## Proposed architecture

Keep the Next.js app as the **control plane** (it can stay on Vercel or wherever it is today). Add a new **VPS agent** on the user’s VPS that acts as the **data plane**: it starts/stops sandbox containers, serves published builds, and updates the reverse-proxy routing table.

```
User browser ──> *.noeron.net / custom.com
                       │
                       ▼
              VPS reverse proxy (nginx/traefik)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
   sandbox container           static site dir
   (vite dev server)           (published build)
         ▲                           ▲
         │                           │
    VPS agent (Node)              VPS agent
         ▲                           │
         │                           │
    Next.js app ──────────────>  file upload / route updates
   (control plane)
```

### Why this architecture

- **Minimal change to existing code**: the provider pattern already abstracts sandbox backends; we only add a `VpsProvider`.
- **Subdomain handling becomes simple**: a wildcard DNS record (`*.noeron.net -> VPS IP`) means the app never has to add per-subdomain DNS records. The VPS reverse proxy routes by `Host` header.
- **Custom domains become simple**: the user points their domain’s A record at the VPS IP; the app tells the VPS agent to add the domain to the routing table; the reverse proxy handles TLS.
- **Static builds can move off the DB**: today `SiteAsset` stores the entire built site in Postgres. Offloading to the VPS removes that storage/egress load.

### Agent location

**Recommendation**: create the agent in this repo under a new top-level `vps-agent/` folder, deployed separately to the VPS.

- **Pros**: shared TypeScript types, one git history, easy to keep the app↔agent contract in sync.
- **Cons**: the repo now contains two deployables; CI needs to know which to deploy.
- **Alternative** (rejected for now): separate repo. Better long-term if the team grows, but adds friction for an MVP migration.

## Detailed implementation plan

### Phase 1 — Foundation and contract

1. Create `vps-agent/` service skeleton.
   - `vps-agent/src/index.ts` — HTTP server (Express/Fastify).
   - `vps-agent/src/config.ts` — env vars: `VPS_AGENT_PORT`, `VPS_AGENT_TOKEN`, `VPS_BASE_DOMAIN`, `VPS_DATA_DIR`, `DOCKER_IMAGE`, `SANDBOX_PORT_RANGE`, `NGINX_RELOAD_CMD`, `TRAEFIK_DYNAMIC_CONFIG_PATH`, etc.
   - `vps-agent/src/routes.ts` — route handlers.
   - `vps-agent/package.json` with `dockerode`, `zod`, etc.
   - `vps-agent/Dockerfile` and a `docker-compose.yml` example.

2. Define the app↔agent HTTP API contract.
   - `POST /sandboxes` — create/resume a sandbox.
   - `GET /sandboxes/:sandboxId` — status/info.
   - `DELETE /sandboxes/:sandboxId` — stop/remove container and routes.
   - `POST /sandboxes/:sandboxId/exec` — run a shell command.
   - `POST /sandboxes/:sandboxId/files` — write files (multipart or base64 JSON).
   - `GET /sandboxes/:sandboxId/files/:path` — read a file.
   - `POST /sandboxes/:sandboxId/extend-timeout` — extend lifetime.
   - `POST /deployments` — publish a static build.
   - `DELETE /deployments/:siteId` — unpublish.
   - `GET /routes` — current routing table for the reverse proxy.

3. Add shared types package or a single source-of-truth file.
   - `lib/sandbox/providers/vps-types.ts` (or `vps-agent/src/types.ts` re-exported) so app and agent share DTO shapes.

### Phase 2 — Sandbox provider

1. Add `lib/sandbox/providers/vps-provider.ts` implementing `SandboxProvider`.
   - `createSandbox` → `POST /sandboxes`, returns `{url: https://{subdomain}.{ROOT_DOMAIN}}`.
   - `reconnect` → `GET /sandboxes/:id` or `POST /sandboxes/:id/resume`.
   - `terminate` → `DELETE /sandboxes/:id`.
   - `executeCommand`, `writeFile`, `writeFiles`, `readFile`, `listFiles`, `installPackages` → map to agent endpoints.
   - `extendTimeout` → `POST /sandboxes/:id/extend-timeout`.
   - Inherits `BaseSandboxProvider` for Vite setup logic.

2. Update `lib/sandbox/factory.ts`.
   - Add `vps` case.
   - `getAvailableProviders()` returns `['e2b', 'vercel', 'vps']`.
   - `isProviderAvailable('vps')` checks `VPS_AGENT_URL` and `VPS_AGENT_TOKEN`.

3. Update `config/app.config.ts`.
   - Add `vps` block: `agentUrl`, `agentToken`, `baseDomain`, `sandboxTimeoutMinutes`, `devPort`, `staticSitesDir`, etc.

4. Update `lib/sandbox/types.ts`.
   - Extend `SandboxProviderConfig` with `vps?: {...}`.
   - Extend `SandboxInfo.provider` to include `'vps'`.

5. Update callers.
   - `app/api/create-ai-sandbox-v2/route.ts` — works unchanged once `VpsProvider` is selected, but remove any Vercel-specific logging/comments.
   - `app/api/sandboxes/route.ts` — same.
   - `app/api/extend-sandbox-timeout/route.ts` — uses provider `extendTimeout`; no change needed.

### Phase 3 — Domains, previews, and static sites

1. Replace `lib/vercel.ts` usage.
   - Create `lib/vps-hosting.ts` with:
     - `addDomainToVps(domain, siteId)` → tells agent to route `domain` to the site.
     - `removeDomainFromVps(domain)`.
     - `verifyDomain(domain)` — DNS check that the domain resolves to the VPS IP.
   - Update `app/api/sites/[id]/custom-domain/*` routes to call `lib/vps-hosting.ts`.

2. Rework `lib/tenancy/preview-mapping.ts`.
   - With the reverse proxy doing the routing, the in-memory map is no longer needed for public traffic, but the Next.js app still needs to know which sandbox belongs to which site for control-plane operations.
   - Keep a minimal in-memory lookup or make it a Prisma query (`GenerationSession` already has `siteId` and `sandboxId`).

3. Update `lib/tenancy/hostname.ts`.
   - Remove/replace `.vercel.app` / `.vercel-dns.com` platform suffixes with the user’s own root domain / VPS domain.

4. Update `app/site-host/[host]/[[...asset]]/route.ts`.
   - If wildcard DNS now points subdomains to the VPS, this route only receives traffic when the platform host is used.
   - Two options (decide during implementation):
     - **A**: Keep the route for fallback/development and have the VPS serve real traffic.
     - **B**: Have the route issue a redirect to the canonical VPS subdomain for live previews.
   - For published sites, add a flow that deploys the built `dist/` to the VPS instead of storing bytes in `SiteAsset`.

5. Add static-site publishing to the VPS.
   - New API: `POST /api/sites/[id]/publish-vps` (or extend existing publish flow).
   - Calls `buildSiteSnapshot` inside the sandbox, then uploads the resulting files to the VPS agent (`POST /deployments`).
   - The agent writes files to `${VPS_DATA_DIR}/sites/{siteId}/` and adds a route mapping `subdomain -> static dir`.
   - Mark the site `published: true` in Prisma; optionally keep `SiteAsset` as a fallback/backup.

### Phase 4 — Cleanup and migration

1. Env vars / config.
   - Add required env vars to `.env.example`:
     - `SANDBOX_PROVIDER=vps`
     - `VPS_AGENT_URL`
     - `VPS_AGENT_TOKEN`
     - `VPS_BASE_DOMAIN`
   - Document nginx/traefik dynamic config strategy (e.g., agent writes a JSON file that a sidecar reloads, or a cron polls `/routes`).

2. Prisma migration.
   - Add `sandboxContainerId` or `sandboxHost` to `GenerationSession` to store the VPS container ID.
   - Optionally add `deploymentUrl` to `Site` for the canonical VPS deployment URL.

3. Remove or make optional `@vercel/sandbox`.
   - Remove from `next.config.ts` `serverExternalPackages` if no longer needed.
   - Keep `vercel-provider.ts` initially for rollback; guard its import so it is not bundled when `SANDBOX_PROVIDER=vps`.

4. Verification.
   - Unit tests for `VpsProvider` using a mocked agent.
   - Manual end-to-end: create sandbox via `app/generation`, edit files, verify preview subdomain resolves to VPS container.
   - Verify custom domain flow with a real domain pointed at the VPS.
   - Run lint / typecheck / build before final commit.

## Open decisions to confirm before starting

1. **Which reverse proxy do you actually run?** You selected “nginx/traefik”. We should pick one concrete default for the first version to avoid writing two full implementations. If both are in use, we will build a proxy-agnostic routing table endpoint and provide reference configs for each.
2. **Does `*.noeron.net` already resolve to the VPS IP, while `app.noeron.net` resolves to the Next.js app?** This is the assumed split. If the wildcard also covers `app.noeron.net`, we need to either proxy `app.*` back to Vercel or use a separate apex record.
3. **Do you want to keep `SiteAsset` as a backup/fallback, or fully replace DB-hosted published sites with VPS files?**
4. **Container strategy**: one Docker container per sandbox, or a single long-lived sandbox runner with user-isolated directories? Per-container is safer and maps cleanly to the current provider model.

## Suggested first step

Implement Phase 1 (agent skeleton + contract) and Phase 2 (VpsProvider wired into the factory) behind the `SANDBOX_PROVIDER=vps` flag. This lets us validate that a Next.js API call can create a sandbox container on the VPS and return a preview URL without touching production Vercel sandboxes. Once that works, we add domains and static-site publishing.

## Estimated touch points

- New files: `vps-agent/**/*`, `lib/sandbox/providers/vps-provider.ts`, `lib/vps-hosting.ts`, `lib/sandbox/providers/vps-types.ts`.
- Modified files: `lib/sandbox/factory.ts`, `lib/sandbox/types.ts`, `config/app.config.ts`, `next.config.ts`, `app/api/sites/[id]/custom-domain/*`, `lib/tenancy/hostname.ts`, `lib/tenancy/preview-mapping.ts`, `prisma/schema.prisma` + migration, `.env.example`.
- Deleted/deprecated: `lib/vercel.ts` calls (kept file for reference, routes stop using it).
