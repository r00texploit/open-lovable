# VPS Agent

A small Node.js/Express service that runs on a VPS and manages Docker sandbox containers plus static site deployments for a Next.js app.

## What it does

- Creates/resumes Docker containers running a Node image (`node:22-slim` by default).
- Optionally installs a minimal Vite React template and starts `npm run dev` on port 3000.
- Maps container port 3000 to a configurable host port range (default `10000-20000`).
- Runs commands, reads/writes files, and extends timeouts inside sandboxes.
- Deploys static sites to `/data/sites/:siteId` and exposes a routing table consumed by nginx/Traefik.
- Persists state to a JSON file so it can reconnect to existing containers after a restart.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VPS_AGENT_TOKEN` | — | **Required.** Bearer token used to authenticate requests from the Next.js app. |
| `VPS_AGENT_PORT` | `3001` | HTTP port for the agent API. |
| `VPS_HOST` | `localhost` | Hostname advertised for containers in the routing table. |
| `VPS_BASE_DOMAIN` | `localhost` | Base domain used for subdomain routes (`*.baseDomain`). |
| `VPS_PORT_MIN` | `10000` | Start of the host port range mapped to sandbox containers. |
| `VPS_PORT_MAX` | `20000` | End of the host port range mapped to sandbox containers. |
| `VPS_SANDBOX_IMAGE` | `node:22-slim` | Docker image used for sandbox containers. |
| `VPS_DEFAULT_TIMEOUT_MINUTES` | `45` | Default sandbox idle timeout in minutes. |
| `VPS_DATA_DIR` | `/data/vps-agent` | Directory for persisted state and static sites. |

## Endpoints

All endpoints except `GET /health` require `Authorization: Bearer <VPS_AGENT_TOKEN>`.

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
- `GET /routes` — return the current routing table.

## Running locally

```bash
npm install
VPS_AGENT_TOKEN=change-me npm run dev
```

## Building and running in production

```bash
npm install
npm run build
VPS_AGENT_TOKEN=change-me VPS_HOST=vps.example.com VPS_BASE_DOMAIN=example.com npm start
```

## Docker

```bash
docker build -t vps-agent .
docker run -d \
  -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /data:/data \
  -e VPS_AGENT_TOKEN=change-me \
  -e VPS_HOST=vps.example.com \
  -e VPS_BASE_DOMAIN=example.com \
  vps-agent
```

The container needs access to the Docker socket (or the Docker CLI) to create and manage sandbox containers.

## Reverse proxy integration

The agent keeps an in-memory/JSON routing table at `GET /routes`. A reverse proxy on the same VPS (nginx, Traefik, Caddy) should poll this endpoint and route matching hostnames either to a container (`host:port`) or to a static site directory.

## Shared types

The request/response shapes mirror `/home/halim/open-lovable-review/lib/sandbox/providers/vps-types.ts`. The agent re-declares these in `src/types.ts` so it can be built independently.
