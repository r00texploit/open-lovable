# Production VPS Agent

A small Node.js/Express service that runs on a VPS and manages Docker sandbox containers plus static site deployments for a Next.js app.

## What it does

- Creates/resumes Docker containers running a pinned Node 22 LTS image by default.
- Optionally installs a minimal Vite React template and starts `npm run dev` on port 3000.
- Maps container port 3000 to a loopback-only host port range (default `10000-20000`).
- Runs commands, reads/writes files, and extends timeouts inside sandboxes.
- Deploys static sites and serves both static sites and previews through a host-aware loopback router.
- Includes Caddy TLS termination with authorization for on-demand custom-domain certificates.
- Persists state to a JSON file so it can reconnect to existing containers after a restart.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VPS_AGENT_TOKEN` | — | **Required.** Random bearer token of at least 32 characters. |
| `VPS_AGENT_PORT` | `3001` | HTTP port for the agent API. |
| `VPS_HOST` | `127.0.0.1` | Loopback host advertised for containers in the routing table; production requires this value. |
| `VPS_BASE_DOMAIN` | — | **Required.** Base domain used for subdomain routes (`*.baseDomain`). |
| `VPS_PUBLIC_IP` | — | **Required.** Public IPv4 address used to continuously revalidate custom-domain A records. |
| `VPS_PORT_MIN` | `10000` | Start of the host port range mapped to sandbox containers. |
| `VPS_PORT_MAX` | `20000` | End of the host port range mapped to sandbox containers. |
| `VPS_SANDBOX_IMAGE` | `node:22.23.1-bookworm-slim` | Pinned Docker image used for sandbox containers. |
| `VPS_DEFAULT_TIMEOUT_MINUTES` | `45` | Default sandbox idle timeout in minutes. |
| `VPS_DATA_DIR` | `/data/vps-agent` | Directory for persisted state and static sites. |
| `VPS_PUBLIC_ROUTER_PORT` | `8080` | Loopback HTTP router used by Caddy. |
| `VPS_SANDBOX_MEMORY_BYTES` | `1073741824` | Per-sandbox memory limit. |
| `VPS_SANDBOX_NANO_CPUS` | `1000000000` | Per-sandbox CPU limit (one CPU). |
| `VPS_SANDBOX_PIDS_LIMIT` | `256` | Per-sandbox process limit. |
| `VPS_SANDBOX_DISK_BYTES` | `805306368` | Size limit for the writable tmpfs workspace. |
| `VPS_SANDBOX_TMP_BYTES` | `134217728` | Size limit for the container `/tmp` tmpfs. |
| `VPS_EXEC_TIMEOUT_SECONDS` | `300` | Hard limit for a foreground sandbox command. |
| `VPS_SANDBOX_RUNTIME` | `runsc` in production Compose | OCI isolation runtime used for untrusted code. Install gVisor/runsc on the host before starting production. |
| `VPS_SANDBOX_NETWORK` | `vps-sandbox-network` | Dedicated network for untrusted sandbox containers. |
| `VPS_SANDBOX_SUBNET` | `172.30.0.0/24` | Non-conflicting CIDR reserved for sandbox containers. |
| `VPS_MAX_SANDBOXES` | `50` | Maximum concurrent sandbox containers. |
| `VPS_MAX_DEPLOYMENT_BYTES` | `52428800` | Maximum encoded static deployment size. |

## Endpoints

All management endpoints require `Authorization: Bearer <VPS_AGENT_TOKEN>`. Health and Caddy authorization are unauthenticated but loopback-only.

- `GET /health` — returns `{ status, version, activeSandboxes, activeDeployments }`.
- `POST /sandboxes` — create/resume a sandbox from `VpsSandboxConfig`.
- `GET /sandboxes/:sandboxId` — return `VpsSandboxInfo`.
- `DELETE /sandboxes/:sandboxId` — stop/remove the container and its routes.
- `POST /sandboxes/:sandboxId/exec` — run a command inside the container.
- `POST /sandboxes/:sandboxId/files` — write files into the container.
- `GET /sandboxes/:sandboxId/files?path=...` / `?dir=...` — read a file or list a directory.
- `POST /sandboxes/:sandboxId/extend-timeout` — extend the sandbox `expiresAt`.
- `POST /deployments` — create/update a static site deployment.
- `DELETE /deployments/:siteId` — remove a static site and its routes.
- `POST /domains` / `DELETE /domains/:domain` — manage custom-domain routes.
- `GET /routes` — return the current routing table.

## Running locally

```bash
npm install
VPS_AGENT_TOKEN=replace-with-at-least-32-random-characters \
VPS_BASE_DOMAIN=example.test \
VPS_PUBLIC_IP=203.0.113.10 \
VPS_HOST=127.0.0.1 \
npm run dev
```

## Production installation

```bash
cp ../.env.production.example ../.env.production
openssl rand -hex 32
# Put the generated secrets, database URL, provider keys, domain, IP, and email in ../.env.production.
docker compose --env-file ../.env.production up -d --build
```

The included Compose stack runs a small `firewall` sidecar with `NET_ADMIN`; it continuously installs and verifies the `DOCKER-USER` egress rules before the agent becomes healthy. If you run the agent directly instead of Compose, install and persist the same rules manually:

```bash
sudo VPS_SANDBOX_SUBNET=172.30.0.0/24 ./install-firewall.sh
```

This blocks generated code from reaching cloud metadata and private networks. Choose a different unused subnet if `172.30.0.0/24` conflicts with your infrastructure.

After the services are healthy, run the end-to-end production gate:

```bash
set -a
. ../.env.production
set +a
./smoke-test.sh
```

Do not put the VPS into service unless this finishes with `VPS production smoke test passed`.

The included Caddy build uses Cloudflare DNS validation for a wildcard certificate. Create a narrowly scoped Cloudflare token with DNS edit permission for this zone, then create A/AAAA records for the root domain and wildcard subdomain pointing to the VPS. Custom domains can use any DNS provider but must keep both their per-site TXT challenge and VPS A record in place. The agent revalidates these records every five minutes and custom routes expire after fifteen minutes if ownership cannot be refreshed. Expose only ports 80 and 443 publicly (and SSH only from trusted IPs). Never expose 3001, 8080, or 10000-20000.

## Security boundary

The Compose stack runs the standalone Next.js control plane, agent, and Caddy with host networking so they can reach loopback-only services without public bindings. Caddy is the only public process. Unknown hosts are rejected, and its on-demand TLS check prevents certificate issuance for unregistered domains.

The agent requires Docker-socket access and therefore has host-level power. Run it on a dedicated VPS, keep the bearer token private, patch the host regularly, and do not colocate unrelated workloads. Production Compose requires the `runsc` runtime so generated code does not share the host kernel directly. Commands run as numeric UID/GID 1000 with all capabilities dropped, a read-only root filesystem, and bounded tmpfs mounts; stopped or legacy unhardened containers are discarded during reconciliation. Set `VPS_SANDBOX_RUNTIME` empty only for trusted local development.

## Shared types

The request/response shapes mirror `/home/halim/open-lovable-review/lib/sandbox/providers/vps-types.ts`. The agent re-declares these in `src/types.ts` so it can be built independently.
