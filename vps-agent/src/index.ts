import 'source-map-support/register';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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
import type { VpsSandboxConfig, VpsDeploymentPayload, VpsFileWrite } from './types';

const PORT = parseInt(process.env.VPS_AGENT_PORT ?? '3001', 10);
const VERSION = process.env.npm_package_version ?? '1.0.0';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(requireAuth);

const store = new AgentStore();

// Reconcile existing Docker containers on startup.
reconcileExistingContainers(store).catch((err) => {
  console.error('Failed to reconcile containers:', err);
});

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
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional()
});

const filesSchema = z.object({
  files: z.array(z.object({
    path: z.string().min(1),
    content: z.string(),
    encoding: z.enum(['base64', 'utf8']).optional()
  }))
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
  }))
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

app.post('/sandboxes', handleAsync(async (req: Request, res: Response) => {
  const config = configSchema.parse(req.body) as VpsSandboxConfig;
  const info = await createOrResumeSandbox(store, config);
  res.status(201).json(info);
}));

app.get('/sandboxes/:sandboxId', handleAsync(async (req: Request, res: Response) => {
  const info = await getSandboxInfo(store, req.params.sandboxId);
  if (!info) {
    res.status(404).json({ error: 'Sandbox not found' });
    return;
  }
  res.json(info);
}));

app.delete('/sandboxes/:sandboxId', handleAsync(async (req: Request, res: Response) => {
  await removeSandbox(store, req.params.sandboxId);
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
    cwd: body.cwd,
    env: body.env
  });
  res.json(result);
}));

app.post('/sandboxes/:sandboxId/files', handleAsync(async (req: Request, res: Response) => {
  const body = filesSchema.parse(req.body);
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
  await createOrUpdateDeployment(store, payload);
  res.status(201).json({ deployed: true, siteId: payload.siteId });
}));

app.delete('/deployments/:siteId', handleAsync(async (req: Request, res: Response) => {
  await removeDeployment(store, req.params.siteId);
  res.json({ removed: true });
}));

app.get('/routes', (_req: Request, res: Response) => {
  res.json({ routes: getRoutes(store) });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation error', issues: err.errors });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`VPS agent listening on port ${PORT}`);
});
