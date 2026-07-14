import Docker from 'dockerode';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import type { VpsSandboxConfig, VpsSandboxInfo, VpsExecResult, VpsFileWrite } from './types';
import { getViteTemplate } from './template';
import { addSandboxRoutes, removeSandboxRoutes } from './routes';
import type { AgentStore } from './store';

export const docker = new Docker();

const HOST = process.env.VPS_HOST ?? 'localhost';
const PORT_MIN = parseInt(process.env.VPS_PORT_MIN ?? '10000', 10);
const PORT_MAX = parseInt(process.env.VPS_PORT_MAX ?? '20000', 10);
const IMAGE = process.env.VPS_SANDBOX_IMAGE ?? 'node:22-slim';
const DEFAULT_TIMEOUT_MINUTES = parseInt(process.env.VPS_DEFAULT_TIMEOUT_MINUTES ?? '45', 10);
const WORKING_DIR = process.env.VPS_SANDBOX_WORKING_DIR ?? '/vercel/sandbox';
const AGENT_LABEL = 'vps-agent';

function getExpiresAt(timeoutMinutes?: number): string {
  const minutes = timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

async function findFreePort(): Promise<number> {
  const used = new Set<number>();
  const containers = await docker.listContainers({ all: true });
  for (const c of containers) {
    for (const p of c.Ports ?? []) {
      if (typeof p.PublicPort === 'number') used.add(p.PublicPort);
    }
  }
  for (let port = PORT_MIN; port <= PORT_MAX; port++) {
    if (!used.has(port)) return port;
  }
  throw new Error('No free host ports available');
}

async function getContainerBySandboxId(sandboxId: string): Promise<Docker.Container | undefined> {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: [`${AGENT_LABEL}=true`, `sandboxId=${sandboxId}`] }
  });
  if (containers.length === 0) return undefined;
  return docker.getContainer(containers[0].Id);
}

function buildUrl(subdomain: string | undefined, customDomain: string | undefined, baseDomain: string): string {
  if (customDomain) return `https://${customDomain}`;
  if (subdomain) return `https://${subdomain}.${baseDomain}`;
  return '';
}

function extractHostPort(info: Docker.ContainerInspectInfo): number {
  const binding = info.HostConfig.PortBindings?.['3000/tcp']?.[0];
  if (binding?.HostPort) return parseInt(binding.HostPort, 10);
  const networkSettings = info.NetworkSettings.Ports?.['3000/tcp']?.[0];
  if (networkSettings?.HostPort) return parseInt(networkSettings.HostPort, 10);
  throw new Error('Could not determine mapped host port');
}

async function runDockerCli(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function runDockerCliWithOutput(args: string[]): Promise<VpsExecResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString('utf8'); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString('utf8'); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}

export async function createOrResumeSandbox(
  store: AgentStore,
  config: VpsSandboxConfig
): Promise<VpsSandboxInfo> {
  const existing = await getContainerBySandboxId(config.sandboxId);
  if (existing) {
    const info = await existing.inspect();
    if (!info.State.Running) {
      await existing.start();
    }
    const port = extractHostPort(info);
    const sandboxInfo: VpsSandboxInfo = {
      sandboxId: config.sandboxId,
      sandboxName: config.sandboxName,
      url: buildUrl(config.subdomain, config.customDomain, config.baseDomain),
      containerId: info.Id,
      host: HOST,
      port,
      status: 'running',
      createdAt: new Date(info.Created).toISOString(),
      expiresAt: getExpiresAt(config.timeoutMinutes)
    };
    store.setSandbox(sandboxInfo);
    addSandboxRoutes(store, sandboxInfo, config.baseDomain, config.subdomain, config.customDomain);
    return sandboxInfo;
  }

  const hostPort = await findFreePort();
  const containerName = `vps-${config.sandboxName.replace(/[^a-zA-Z0-9_-]/g, '-')}-${config.sandboxId.slice(0, 8)}`;

  const container = await docker.createContainer({
    Image: IMAGE,
    name: containerName,
    Labels: {
      [AGENT_LABEL]: 'true',
      sandboxId: config.sandboxId,
      sandboxName: config.sandboxName,
      ...(config.subdomain ? { subdomain: config.subdomain } : {})
    },
    ExposedPorts: { '3000/tcp': {} },
    HostConfig: {
      PortBindings: { '3000/tcp': [{ HostIp: '0.0.0.0', HostPort: String(hostPort) }] },
      NetworkMode: 'bridge',
      RestartPolicy: { Name: 'no' }
    },
    Env: ['NODE_ENV=development'],
    Cmd: ['tail', '-f', '/dev/null'],
    WorkingDir: WORKING_DIR
  });

  await container.start();

  const containerInfo = await container.inspect();
  const port = extractHostPort(containerInfo);
  const sandboxInfo: VpsSandboxInfo = {
    sandboxId: config.sandboxId,
    sandboxName: config.sandboxName,
    url: buildUrl(config.subdomain, config.customDomain, config.baseDomain),
    containerId: containerInfo.Id,
    host: HOST,
    port,
    status: 'running',
    createdAt: new Date().toISOString(),
    expiresAt: getExpiresAt(config.timeoutMinutes)
  };

  store.setSandbox(sandboxInfo);

  if (config.setupOnCreate) {
    await setupViteTemplate(container, WORKING_DIR);
    await execInContainer(container, ['npm', 'install'], { cwd: WORKING_DIR });
    await execInContainer(container, ['npm', 'run', 'dev'], { cwd: WORKING_DIR, detach: true });
  }

  addSandboxRoutes(store, sandboxInfo, config.baseDomain, config.subdomain, config.customDomain);
  return sandboxInfo;
}

async function setupViteTemplate(container: Docker.Container, cwd: string): Promise<void> {
  const files = getViteTemplate();
  await writeFilesToContainer(container, cwd, files);
}

export async function getSandboxInfo(store: AgentStore, sandboxId: string): Promise<VpsSandboxInfo | undefined> {
  return store.getSandbox(sandboxId);
}

export async function removeSandbox(store: AgentStore, sandboxId: string): Promise<void> {
  const container = await getContainerBySandboxId(sandboxId);
  if (container) {
    try {
      await container.stop({ t: 5 });
    } catch {
      // Container may already be stopped.
    }
    try {
      await container.remove({ force: true });
    } catch {
      // Ignore removal errors.
    }
  }
  removeSandboxRoutes(store, sandboxId);
  store.deleteSandbox(sandboxId);
}

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  detach?: boolean;
}

export async function execInContainer(
  container: Docker.Container,
  command: string[],
  opts: ExecOptions = {}
): Promise<VpsExecResult> {
  const containerInfo = await container.inspect();
  const containerId = containerInfo.Id;
  const args = ['exec'];
  if (opts.cwd) args.push('-w', opts.cwd);
  if (opts.env) {
    for (const [k, v] of Object.entries(opts.env)) {
      args.push('-e', `${k}=${v}`);
    }
  }
  if (opts.detach) args.push('-d');
  args.push(containerId, ...command);

  if (opts.detach) {
    await runDockerCli(args);
    return { stdout: '', stderr: '', exitCode: 0 };
  }
  return runDockerCliWithOutput(args);
}

export async function writeFilesToContainer(
  container: Docker.Container,
  cwd: string,
  files: VpsFileWrite[]
): Promise<number> {
  const containerInfo = await container.inspect();
  const containerId = containerInfo.Id;

  let written = 0;
  for (const file of files) {
    const fullContainerPath = path.posix.isAbsolute(file.path)
      ? file.path
      : path.posix.join(cwd, file.path.replace(/^\/+/, ''));
    const decoded = file.encoding === 'base64'
      ? Buffer.from(file.content, 'base64')
      : Buffer.from(file.content, 'utf8');

    // Ensure parent directory exists inside the container.
    const parentDir = path.posix.dirname(fullContainerPath);
    await execInContainer(container, ['mkdir', '-p', parentDir], { cwd: '/' });

    const tmpFile = path.join('/tmp', `vps-${Date.now()}-${written}`);
    await fs.writeFile(tmpFile, decoded);
    try {
      await runDockerCli(['cp', tmpFile, `${containerId}:${fullContainerPath}`]);
      written++;
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
  return written;
}

export async function readFileFromContainer(
  container: Docker.Container,
  cwd: string,
  filePath: string
): Promise<{ content: string; encoding: 'utf8' | 'base64' }> {
  const target = path.posix.isAbsolute(filePath)
    ? filePath
    : path.posix.join(cwd, filePath.replace(/^\/+/, ''));
  const result = await runDockerCliWithOutput(['exec', (await container.inspect()).Id, 'cat', target]);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to read file');
  }
  const content = Buffer.from(result.stdout, 'binary');
  const utf8 = content.toString('utf8');
  if (utf8.includes('�')) {
    return { content: content.toString('base64'), encoding: 'base64' };
  }
  return { content: utf8, encoding: 'utf8' };
}

export async function listFilesInContainer(
  container: Docker.Container,
  cwd: string,
  dirPath: string
): Promise<string[]> {
  const target = path.posix.isAbsolute(dirPath)
    ? dirPath
    : path.posix.join(cwd, dirPath.replace(/^\/+/, ''));
  const result = await runDockerCliWithOutput([
    'exec',
    (await container.inspect()).Id,
    'find',
    target,
    '-type',
    'f',
    '-not',
    '-path',
    '*/node_modules/*',
    '-not',
    '-path',
    '*/.git/*',
    '-not',
    '-path',
    '*/.next/*',
    '-not',
    '-path',
    '*/dist/*',
    '-not',
    '-path',
    '*/build/*'
  ]);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to list files');
  }
  const prefix = target.endsWith('/') ? target : `${target}/`;
  return result.stdout.split('\n').filter(Boolean).map((p) => p.startsWith(prefix) ? p.slice(prefix.length) : p);
}

export async function extendSandboxTimeout(
  store: AgentStore,
  sandboxId: string,
  durationMs: number
): Promise<boolean> {
  const sandbox = store.getSandbox(sandboxId);
  if (!sandbox) return false;
  const current = sandbox.expiresAt ? new Date(sandbox.expiresAt).getTime() : Date.now();
  sandbox.expiresAt = new Date(current + durationMs).toISOString();
  store.setSandbox(sandbox);
  return true;
}

export async function reconcileExistingContainers(store: AgentStore): Promise<void> {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: [`${AGENT_LABEL}=true`] }
  });
  for (const c of containers) {
    const sandboxId = c.Labels['sandboxId'];
    const sandboxName = c.Labels['sandboxName'] ?? sandboxId;
    const port = c.Ports?.find((p: { PrivatePort?: number; PublicPort?: number }) => p.PrivatePort === 3000)?.PublicPort ?? 0;
    const status: VpsSandboxInfo['status'] = c.State === 'running' ? 'running' : 'paused';
    store.setSandbox({
      sandboxId,
      sandboxName,
      url: '',
      containerId: c.Id,
      host: HOST,
      port,
      status,
      createdAt: new Date(c.Created * 1000).toISOString()
    });
  }
}

export async function getContainerForSandbox(sandboxId: string): Promise<Docker.Container | undefined> {
  return getContainerBySandboxId(sandboxId);
}
