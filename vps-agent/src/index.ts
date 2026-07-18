import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
const WORKING_DIR = process.env.VPS_SANDBOX_WORKING_DIR ?? '/vercel/sandbox';

import { requireAuth } from './auth';
import { AgentStore } from './store';
import {
  createOrResumeSandbox,
  getSandboxInfo,
  removeSandbox,
  execInContainer,
  writeFilesToContainer,
  readFileFromContainer,
  listFilesInContainer,
  extendSandboxTimeout,
  reconcileExistingContainers,
  getContainerForSandbox
} from './docker';
import { createOrUpdateDeployment, removeDeployment } from './deployments';
import { getRoutes } from './routes';
import { addDomainRoute, isRouteAuthorized, removeDomainRoute } from './routes';
import { startPublicServer } from './public-server';
import { revalidateCustomDomainRoutes } from './domain-authorization';
import { normalizeHostname, resolvePosixContainedPath } from './security';
import type { VpsSandboxConfig, VpsDeploymentPayload, VpsFileWrite } from './types';

const PORT = parseInt(process.env.VPS_AGENT_PORT ?? '3001', 10);
const VERSION = process.env.npm_package_version ?? '1.0.0';
const PUBLIC_PORT = parseInt(process.env.VPS_PUBLIC_ROUTER_PORT ?? '8080', 10);
const MAX_SANDBOXES = parseInt(process.env.VPS_MAX_SANDBOXES ?? '50', 10);
const MAX_DEPLOYMENT_BYTES = parseInt(process.env.VPS_MAX_DEPLOYMENT_BYTES ?? String(50 * 1024 * 1024), 10);
const EXEC_TIMEOUT_SECONDS = parseInt(process.env.VPS_EXEC_TIMEOUT_SECONDS ?? '300', 10);

const app = express();
app.use(express.json({ limit: `${Math.ceil(MAX_DEPLOYMENT_BYTES * 1.4) + 1024 * 1024}b` }));
app.use(requireAuth);

const store = new AgentStore();
let mutationTail: Promise<void> = Promise.resolve();

async function withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = mutationTail;
  let release!: () => void;
  mutationTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

const configSchema = z.object({
  sandboxName: z.string().min(1),
  sandboxId: z.string().min(1),
  subdomain: z.string().optional(),
  customDomain: z.string().optional(),
  baseDomain: z.string().min(1),
  setupOnCreate: z.boolean().optional(),
  timeoutMinutes: z.number().int().positive().optional()
});

const execSchema = z.object({
  command: z.string().min(1).max(1024 * 1024),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional()
});

const filesSchema = z.object({
  files: z.array(z.object({
    path: z.string().min(1),
    content: z.string(),
    encoding: z.enum(['base64', 'utf8']).optional()
  })).max(2000)
});

const extendSchema = z.object({
  durationMs: z.number().int().positive()
});

const deploymentSchema = z.object({
  siteId: z.string().min(1),
  subdomain: z.string().min(1),
  customDomain: z.string().optional(),
  files: z.array(z.object({
    path: z.string().min(1),
    content: z.string(),
    encoding: z.enum(['base64', 'utf8']).optional()
  })).max(5000)
});
const domainSchema = z.object({
  domain: z.string().min(1).max(253),
  siteId: z.string().min(1).max(128),
  verificationToken: z.string().regex(/^[a-zA-Z0-9_-]{32,128}$/),
});

function parseCommand(command: string): string[] {
  // The Next.js provider sends full shell command strings (e.g. "bash -c 'npm install'").
  // Run them through bash so quoting, pipes, and variable expansion work as expected.
  return ['bash', '-c', command];
}

function handleAsync(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: VERSION,
    activeSandboxes: store.activeSandboxes,
    activeDeployments: store.activeDeployments
  });
});

// Caddy on-demand TLS authorization. This endpoint is loopback-only because
// the API listener itself binds to 127.0.0.1.
app.get('/caddy/ask', (req: Request, res: Response) => {
  const domain = typeof req.query.domain === 'string' ? req.query.domain.toLowerCase().replace(/\.$/, '') : '';
  const baseDomain = process.env.VPS_BASE_DOMAIN!.toLowerCase();
  const authorized = store.routes.some((route) => route.host === domain && isRouteAuthorized(route, baseDomain));
  res.sendStatus(authorized ? 200 : 404);
});

app.post('/sandboxes', handleAsync(async (req: Request, res: Response) => {
  const config = configSchema.parse(req.body) as VpsSandboxConfig;
  const info = await withMutationLock(async () => {
    if (!store.getSandbox(config.sandboxId) && store.activeSandboxes >= MAX_SANDBOXES) {
      const error = new Error('Sandbox capacity reached') as Error & { status: number };
      error.status = 429;
      throw error;
    }
    return createOrResumeSandbox(store, config);
  });
  res.status(201).json(info);
}));

app.get('/sandboxes/:sandboxId', handleAsync(async (req: Request, res: Response) => {
  const info = await withMutationLock(() => getSandboxInfo(store, req.params.sandboxId));
  if (!info) {
    res.status(404).json({ error: 'Sandbox not found' });
    return;
  }
  res.json(info);
}));

app.delete('/sandboxes/:sandboxId', handleAsync(async (req: Request, res: Response) => {
  await withMutationLock(() => removeSandbox(store, req.params.sandboxId));
  res.json({ removed: true });
}));

app.post('/sandboxes/:sandboxId/exec', handleAsync(async (req: Request, res: Response) => {
  const body = execSchema.parse(req.body);
  const container = await getContainerForSandbox(req.params.sandboxId);
  if (!container) {
    res.status(404).json({ error: 'Sandbox not found' });
    return;
  }
  const result = await execInContainer(container, parseCommand(body.command), {
    cwd: body.cwd ? resolvePosixContainedPath(WORKING_DIR, body.cwd) : WORKING_DIR,
    env: body.env,
    timeoutSeconds: EXEC_TIMEOUT_SECONDS,
  });
  res.json(result);
}));

app.post('/sandboxes/:sandboxId/files', handleAsync(async (req: Request, res: Response) => {
  const body = filesSchema.parse(req.body);
  const decodedBytes = body.files.reduce(
    (total, file) => total + Buffer.byteLength(file.content, file.encoding === 'base64' ? 'base64' : 'utf8'),
    0,
  );
  if (decodedBytes > MAX_DEPLOYMENT_BYTES) {
    res.status(413).json({ error: 'File upload exceeds size limit' }); return;
  }
  const container = await getContainerForSandbox(req.params.sandboxId);
  if (!container) {
    res.status(404).json({ error: 'Sandbox not found' });
    return;
  }
  const written = await writeFilesToContainer(container, WORKING_DIR, body.files as VpsFileWrite[]);
  res.json({ written });
}));

app.get('/sandboxes/:sandboxId/files', handleAsync(async (req: Request, res: Response) => {
  const container = await getContainerForSandbox(req.params.sandboxId);
  if (!container) {
    res.status(404).json({ error: 'Sandbox not found' });
    return;
  }

  if (typeof req.query.path === 'string') {
    const file = await readFileFromContainer(container, WORKING_DIR, req.query.path);
    res.json(file);
    return;
  }

  if (typeof req.query.dir === 'string') {
    const files = await listFilesInContainer(container, WORKING_DIR, req.query.dir);
    res.json({ files });
    return;
  }

  res.status(400).json({ error: 'Provide ?path= or ?dir=' });
}));

app.post('/sandboxes/:sandboxId/extend-timeout', handleAsync(async (req: Request, res: Response) => {
  const body = extendSchema.parse(req.body);
  const ok = await extendSandboxTimeout(store, req.params.sandboxId, body.durationMs);
  if (!ok) {
    res.status(404).json({ error: 'Sandbox not found' });
    return;
  }
  res.json({ extended: true });
}));

app.post('/deployments', handleAsync(async (req: Request, res: Response) => {
  const payload = deploymentSchema.parse(req.body) as VpsDeploymentPayload;
  const decodedBytes = payload.files.reduce(
    (total, file) => total + Buffer.byteLength(file.content, file.encoding === 'base64' ? 'base64' : 'utf8'),
    0,
  );
  if (decodedBytes > MAX_DEPLOYMENT_BYTES) {
    res.status(413).json({ error: 'Deployment exceeds size limit' }); return;
  }
  await withMutationLock(() => createOrUpdateDeployment(store, payload));
  res.status(201).json({ deployed: true, siteId: payload.siteId });
}));

app.delete('/deployments/:siteId', handleAsync(async (req: Request, res: Response) => {
  await withMutationLock(() => removeDeployment(store, req.params.siteId));
  res.json({ removed: true });
}));

app.post('/domains', handleAsync(async (req: Request, res: Response) => {
  const body = domainSchema.parse(req.body);
  const added = await withMutationLock(async () => addDomainRoute(store, body.siteId, body.domain, body.verificationToken));
  if (!added) {
    res.status(404).json({ error: 'No deployment route exists for this site' }); return;
  }
  res.status(201).json({ added: true });
}));

app.delete('/domains/:domain', handleAsync(async (req: Request, res: Response) => {
  res.json({ removed: await withMutationLock(async () => removeDomainRoute(store, req.params.domain)) });
}));

app.get('/routes', (_req: Request, res: Response) => {
  res.json({
    routes: getRoutes(store).map(({ domainVerificationToken: _secret, ...route }) => route),
  });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation error', issues: err.errors });
    return;
  }
  console.error(err);
  const candidateStatus = typeof err === 'object' && err && 'status' in err ? (err as { status?: number }).status : undefined;
  const status = candidateStatus === 413 || candidateStatus === 429 ? candidateStatus : 500;
  res.status(status).json({ error: status === 413 ? 'Request body too large' : status === 429 ? 'Sandbox capacity reached' : 'Internal server error' });
});

async function start(): Promise<void> {
  if (!process.env.VPS_AGENT_TOKEN || process.env.VPS_AGENT_TOKEN.length < 32) {
    throw new Error('VPS_AGENT_TOKEN must be a random value of at least 32 characters');
  }
  if (!process.env.VPS_BASE_DOMAIN) {
    throw new Error('VPS_BASE_DOMAIN is required');
  }
  if (!process.env.VPS_PUBLIC_IP) {
    throw new Error('VPS_PUBLIC_IP is required for custom-domain revalidation');
  }
  normalizeHostname(process.env.VPS_BASE_DOMAIN);
  if ((process.env.VPS_HOST ?? '127.0.0.1') !== '127.0.0.1') {
    throw new Error('VPS_HOST must be 127.0.0.1 so sandbox ports remain private');
  }
  if ((process.env.VPS_SANDBOX_BIND_IP ?? '127.0.0.1') !== '127.0.0.1') {
    throw new Error('VPS_SANDBOX_BIND_IP must be 127.0.0.1');
  }
  for (const [name, value] of Object.entries({ PORT, PUBLIC_PORT, MAX_SANDBOXES, MAX_DEPLOYMENT_BYTES, EXEC_TIMEOUT_SECONDS })) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  }
  if (PORT > 65535 || PUBLIC_PORT > 65535 || PORT === PUBLIC_PORT) {
    throw new Error('Agent and public-router ports must be distinct valid TCP ports');
  }
  await store.load();
  await reconcileExistingContainers(store);
  await withMutationLock(() => revalidateCustomDomainRoutes(store, process.env.VPS_PUBLIC_IP!));
  app.listen(PORT, '127.0.0.1', () => console.log(`VPS agent listening on 127.0.0.1:${PORT}`));
  startPublicServer(store, PUBLIC_PORT);
  setInterval(() => {
    const now = Date.now();
    for (const sandbox of store.sandboxes.values()) {
      if (sandbox.expiresAt && new Date(sandbox.expiresAt).getTime() <= now) {
        void withMutationLock(() => removeSandbox(store, sandbox.sandboxId))
          .catch((error) => console.error('Expiry cleanup failed:', error));
      }
    }
  }, 60_000).unref();
  setInterval(() => {
    void withMutationLock(() => revalidateCustomDomainRoutes(store, process.env.VPS_PUBLIC_IP!))
      .catch((error) => console.error('Custom-domain revalidation failed:', error));
  }, 5 * 60_000).unref();
}

void start().catch((error) => { console.error('VPS agent startup failed:', error); process.exit(1); });
