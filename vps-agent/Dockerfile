FROM node:22-slim

WORKDIR /app

# Install Docker CLI so the agent can shell out when dockerode is not enough.
RUN apt-get update && apt-get install -y \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

# The agent HTTP API port. Sandboxes use the configured host port range (default 10000-20000).
EXPOSE 3001

ENV NODE_ENV=production
ENV VPS_AGENT_PORT=3001

CMD ["npm", "start"]
