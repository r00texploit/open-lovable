# VPS Agent Installation Guide

This guide walks you through installing the `vps-agent` service on your own VPS so the Open-Lovable app can create preview sandboxes and host published static sites there instead of on Vercel.

## What you need before starting

1. A VPS running a recent Linux distro (Ubuntu 22.04/24.04, Debian 12, etc.).
2. A static public IP address on the VPS.
3. DNS configured as follows:
   - `noeron.net` apex → the VPS public IP for the included production topology
   - `*.noeron.net` (or your `VPS_BASE_DOMAIN`) → the same VPS public IP
4. Docker installed on the VPS.
5. The gVisor `runsc` Docker runtime installed and registered for untrusted production sandboxes.
6. `docker-compose-plugin` for the canonical deployment.
7. The included Compose deployment builds and configures Caddy. For a custom deployment, provide an equivalent host-aware reverse proxy.

> The canonical `docker-compose.yml` runs the Next.js control plane, VPS agent, firewall enforcer, and Caddy together on one dedicated VPS. The agent API and sandbox ports remain loopback-only; Caddy is the only public service.

## Quick overview

```
User browser
    │
    ▼
*.noeron.net / custom.com
    │
    ▼
VPS reverse proxy (nginx/Traefik)  ← reads routing table from vps-agent
    │
    ├─────▶ Docker container: Vite dev server  (live sandbox)
    └─────▶ /data/vps-agent/sites/:siteId      (published static site)
    ▲
    │
vps-agent (Node/Express, port 3001)
    ▲
    │
Next.js app on the same VPS (loopback-only)
```

## Step 1 — Install Docker

If Docker is not installed yet:

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Verify:

```bash
docker ps
```

You should see an empty container list without `sudo`.

## Step 2 — Deploy vps-agent

### Option A: Docker Compose (recommended)

Copy the `vps-agent` folder to your VPS:

```bash
rsync -av vps-agent/ root@YOUR_VPS_IP:/opt/vps-agent/
```

Create an environment file on the VPS:

```bash
ssh root@YOUR_VPS_IP "mkdir -p /opt/vps-agent && cat > /opt/vps-agent/.env <<'EOF'
VPS_AGENT_TOKEN=CHANGE_ME_TO_A_LONG_RANDOM_STRING
VPS_AGENT_PORT=3001
VPS_HOST=127.0.0.1
VPS_BASE_DOMAIN=noeron.net
VPS_PORT_MIN=10000
VPS_PORT_MAX=20000
VPS_SANDBOX_IMAGE=node:22-slim
VPS_DEFAULT_TIMEOUT_MINUTES=45
VPS_DATA_DIR=/data/vps-agent
VPS_SANDBOX_WORKING_DIR=/vercel/sandbox
EOF"
```

Replace:
- `CHANGE_ME_TO_A_LONG_RANDOM_STRING` with a secure token. The Next.js app will send this as `Authorization: Bearer <token>`.
- Keep `VPS_HOST=127.0.0.1`; sandbox ports must never be publicly bound.
- `noeron.net` with your real base domain.

Start the agent:

```bash
ssh root@YOUR_VPS_IP "cd /opt/vps-agent && docker compose up -d --build"
```

Check logs:

```bash
ssh root@YOUR_VPS_IP "cd /opt/vps-agent && docker compose logs -f"
```

### Option B: Run directly with Node

If you prefer not to use Docker for the agent itself:

```bash
ssh root@YOUR_VPS_IP
mkdir -p /opt/vps-agent
cd /opt/vps-agent
# copy the vps-agent files into this directory
npm install
npm run build
```

Create a systemd service at `/etc/systemd/system/vps-agent.service`:

```ini
[Unit]
Description=VPS Agent for Open-Lovable
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vps-agent
Environment=VPS_AGENT_TOKEN=CHANGE_ME_TO_A_LONG_RANDOM_STRING
Environment=VPS_AGENT_PORT=3001
Environment=VPS_HOST=127.0.0.1
Environment=VPS_BASE_DOMAIN=noeron.net
Environment=VPS_PORT_MIN=10000
Environment=VPS_PORT_MAX=20000
Environment=VPS_SANDBOX_IMAGE=node:22-slim
Environment=VPS_DEFAULT_TIMEOUT_MINUTES=45
Environment=VPS_DATA_DIR=/data/vps-agent
Environment=VPS_SANDBOX_WORKING_DIR=/vercel/sandbox
ExecStart=/usr/bin/node /opt/vps-agent/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vps-agent
sudo systemctl start vps-agent
sudo systemctl status vps-agent
```

## Step 3 — Verify the agent API

From the VPS:

```bash
curl -s http://localhost:3001/health | jq .
```

Expected output:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "activeSandboxes": 0,
  "activeDeployments": 0
}
```

Test authentication:

```bash
curl -s http://localhost:3001/routes \
  -H "Authorization: Bearer CHANGE_ME_TO_A_LONG_RANDOM_STRING" | jq .
```

Expected:

```json
{
  "routes": []
}
```

## Step 4 — Configure the reverse proxy

The canonical Compose deployment already includes Caddy and needs no generated nginx/Traefik route files. The alternatives below apply only to custom non-Compose deployments.

The reverse proxy is the entry point for all sandbox preview subdomains and custom domains. It must:

1. Read the routing table from `GET http://localhost:3001/routes`.
2. For each route, forward requests to either:
   - `container` target → proxy to `http://<host>:<port>` (the Docker-mapped host port)
   - `static` target → serve files from the directory path
3. Handle HTTPS/TLS for every incoming hostname.

### nginx example

Create `/etc/nginx/sites-available/vps-agent-routes`:

```nginx
map $http_host $vps_target {
    default "";
    # Routes will be inserted here by the reload script.
}

server {
    listen 80;
    listen [::]:80;
    server_name *.noeron.net noeron.net;

    location / {
        if ($vps_target = "") {
            return 502 "No route for this host";
        }

        proxy_pass $vps_target;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

For static sites you need a separate map for directories. A more complete setup uses Lua or a generated include file. Below is a simpler approach: generate an include file from the agent's routes.

Create `/opt/vps-agent/update-nginx.sh`:

```bash
#!/bin/bash
set -e

AGENT_TOKEN="CHANGE_ME_TO_A_LONG_RANDOM_STRING"
ROUTES_FILE="/etc/nginx/conf.d/vps-routes.conf"
TMP_FILE="/tmp/vps-routes.conf"

curl -s http://localhost:3001/routes \
  -H "Authorization: Bearer $AGENT_TOKEN" | \
  node -e '
    let data = "";
    process.stdin.on("data", c => data += c);
    process.stdin.on("end", () => {
      const obj = JSON.parse(data);
      const routes = obj.routes || [];
      const out = ["map \$http_host \$vps_target {"];
      out.push("  default \"\";");
      for (const r of routes) {
        if (r.target.type === "container") {
          out.push(`  ${r.host} "http://${r.target.value}";`);
        }
      }
      out.push("}");
      out.push("map \$http_host \$vps_static_dir {");
      out.push("  default \"\";");
      for (const r of routes) {
        if (r.target.type === "static") {
          out.push(`  ${r.host} "${r.target.value}";`);
        }
      }
      out.push("}");
      console.log(out.join("\n"));
    });
' > "$TMP_FILE"

sudo mv "$TMP_FILE" "$ROUTES_FILE"
sudo nginx -s reload
```

Make it executable:

```bash
chmod +x /opt/vps-agent/update-nginx.sh
```

Add this to your nginx config instead of the inline map above:

```nginx
include /etc/nginx/conf.d/vps-routes.conf;

server {
    listen 80;
    listen [::]:80;
    server_name *.noeron.net noeron.net;

    root /var/www/placeholder;

    location / {
        if ($vps_target != "") {
            proxy_pass $vps_target;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            break;
        }

        if ($vps_static_dir != "") {
            root $vps_static_dir;
            try_files $uri $uri/ /index.html;
            break;
        }

        return 502 "No route for this host";
    }
}
```

Run the update script manually:

```bash
/opt/vps-agent/update-nginx.sh
```

Schedule it with cron so route changes are picked up quickly:

```bash
crontab -e
```

Add:

```cron
* * * * * /opt/vps-agent/update-nginx.sh >> /var/log/vps-nginx-update.log 2>&1
```

For HTTPS, add certbot or use nginx with a wildcard certificate.

### Traefik example (dynamic config)

Traefik can poll the agent and generate routes. Add a dynamic file provider.

Create `/opt/vps-agent/update-traefik.sh`:

```bash
#!/bin/bash
set -e

AGENT_TOKEN="CHANGE_ME_TO_A_LONG_RANDOM_STRING"
ROUTES_FILE="/etc/traefik/dynamic/vps-routes.yml"
TMP_FILE="/tmp/vps-routes.yml"

curl -s http://localhost:3001/routes \
  -H "Authorization: Bearer $AGENT_TOKEN" | \
  node -e '
    let data = "";
    process.stdin.on("data", c => data += c);
    process.stdin.on("end", () => {
      const { routes } = JSON.parse(data);
      const http = { routers: {}, services: {} };
      for (const r of routes) {
        const name = r.host.replace(/[^a-zA-Z0-9]/g, "-");
        http.routers[name] = { rule: `Host(\`${r.host}\`)`, service: name };
        if (r.target.type === "container") {
          http.services[name] = { loadBalancer: { servers: [{ url: `http://${r.target.value}` }] } };
        } else {
          http.routers[name].middlewares = ["strip-prefix"];
          http.services[name] = { loadBalancer: { servers: [{ url: `file://${r.target.value}` }] } };
        }
      }
      console.log(JSON.stringify({ http }, null, 2));
    });
' > "$TMP_FILE"

sudo mv "$TMP_FILE" "$ROUTES_FILE"
```

Make executable and schedule with cron.

### Caddy example

Caddy's `dynamic` config via the `http` app is possible but less common. Use a simple Caddyfile generator similar to the nginx example if you prefer Caddy.

## Step 5 — Configure the Next.js app

Set these environment variables in the project that runs the Next.js app:

```env
# Switch from Vercel to the VPS provider
SANDBOX_PROVIDER=vps

# Connection to the loopback-only agent in the canonical Compose topology
VPS_AGENT_URL=http://127.0.0.1:3001
VPS_AGENT_TOKEN=CHANGE_ME_TO_A_LONG_RANDOM_STRING

# Domain setup
VPS_BASE_DOMAIN=noeron.net
VPS_PUBLIC_IP=YOUR_VPS_PUBLIC_IP
VPS_SANDBOX_DEV_PORT=3000

VPS_DEPLOYMENTS_ENABLED=true
```

Never expose port 3001 publicly. If the control plane and agent are on separate dedicated hosts, use a private authenticated network and firewall the agent to the control-plane address.

Redeploy the Next.js app after changing env vars.

## Step 6 — Test the full flow

1. Create a site in the app.
2. Open the generation page for that site.
3. The app should call `POST /api/create-ai-sandbox-v2` and create a container on the VPS.
4. Browse to `https://<site-subdomain>.noeron.net`. The reverse proxy should forward to the container.
5. Publish the site. The app should call `POST /api/sites/[id]/publish`, the agent should write files to `/data/vps-agent/sites/<siteId>`, and the published subdomain should serve the static build.
6. Add a custom domain. Publish both the per-site TXT ownership challenge and the A record shown by the UI. The agent adds the route only after both records verify.

## Troubleshooting

### Agent returns `Unauthorized`

- Verify the `Authorization: Bearer <token>` header matches `VPS_AGENT_TOKEN`.
- The app and agent must use the exact same token.

### Container starts but the subdomain returns 502

- Check the routing table: `curl ... /routes`.
- Confirm the reverse-proxy reload script ran and nginx/Traefik picked up the new route.
- Check that the container port is mapped: `docker ps` should show `0.0.0.0:XXXXX->3000/tcp`.

### Vite dev server not accessible inside the container

- Check the dev-server log inside the container:
  ```bash
  docker exec vps-... cat /tmp/vite.log
  ```
- The container image needs Node 22+ and the template uses `vite --host --port 3000`.

### Agent cannot create Docker containers

- The agent container must mount `/var/run/docker.sock` (Docker Compose option A does this).
- If running systemd directly, the `vps-agent.service` file has `Requires=docker.service`.

### DNS not resolving

- `dig +short *.noeron.net` will not return an answer because wildcards match any specific subdomain. Test with a real subdomain:
  ```bash
  dig +short test.noeron.net
  ```
- It should resolve to `YOUR_VPS_PUBLIC_IP`.

## Security checklist

- [ ] `VPS_AGENT_TOKEN` is a long random string and stored as a secret.
- [ ] The agent's HTTP port is **not** exposed to the public internet unless required. The Next.js app can reach it; browsers do not need to.
- [ ] Docker socket access is restricted to the agent process.
- [ ] HTTPS/TLS terminates at the reverse proxy with valid certificates for all served hostnames.
- [ ] Custom-domain verification ensures users can only claim domains they actually own (A record check).

## Next steps

- For production, add log rotation and monitoring for the agent.
- Consider a separate network/VLAN for sandbox containers if you need stronger isolation between tenants.
- Add resource limits to sandbox containers (CPU/memory) in `vps-agent/src/docker.ts` if you host many users.
