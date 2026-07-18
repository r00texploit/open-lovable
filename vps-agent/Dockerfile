FROM node:22.23.1-bookworm-slim AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:22.23.1-bookworm-slim AS runner
WORKDIR /app

# Docker CLI is needed for exec/copy operations; the daemon stays on the host.
RUN apt-get update && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY install-firewall.sh ./install-firewall.sh

# The agent HTTP API port. Sandboxes use the configured host port range (default 10000-20000).
EXPOSE 3001

ENV NODE_ENV=production
ENV VPS_AGENT_PORT=3001

CMD ["npm", "start"]
