import fs from 'fs/promises';
import path from 'path';
import type { VpsSandboxInfo, VpsRouteEntry, VpsDeploymentRecord } from './types';

interface PersistedState {
  sandboxes: Record<string, VpsSandboxInfo>;
  deployments: Record<string, VpsDeploymentRecord>;
  routes: VpsRouteEntry[];
}

export class AgentStore {
  sandboxes: Map<string, VpsSandboxInfo> = new Map();
  deployments: Map<string, VpsDeploymentRecord> = new Map();
  routes: VpsRouteEntry[] = [];

  private saveQueue: Promise<void> = Promise.resolve();
  private readonly dataDir: string;
  private readonly stateFile: string;

  constructor(dataDir = process.env.VPS_DATA_DIR ?? '/data/vps-agent') {
    this.dataDir = dataDir;
    this.stateFile = path.join(dataDir, 'state.json');
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  async load(): Promise<void> {
    try {
      await this.ensureDir();
      const raw = await fs.readFile(this.stateFile, 'utf8');
      const state: PersistedState = JSON.parse(raw);
      this.sandboxes = new Map(Object.entries(state.sandboxes ?? {}));
      this.routes = state.routes ?? [];
      this.deployments = new Map(Object.entries(state.deployments ?? {}).map(([siteId, value]) => {
        const route = this.routes.find((candidate) => candidate.siteId === siteId && candidate.target.type === 'static');
        return [siteId, {
          siteId,
          subdomain: value.subdomain,
          customDomain: value.customDomain,
          releaseDir: value.releaseDir || route?.target.value || '',
          deployedAt: value.deployedAt || new Date(0).toISOString(),
        }];
      }));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async save(): Promise<void> {
    this.saveQueue = this.saveQueue.then(async () => {
      await this.ensureDir();
      const state: PersistedState = {
        sandboxes: Object.fromEntries(this.sandboxes),
        deployments: Object.fromEntries(this.deployments),
        routes: this.routes
      };
      const temporary = `${this.stateFile}.${process.pid}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temporary, this.stateFile);
    });
    return this.saveQueue;
  }

  setSandbox(info: VpsSandboxInfo): void {
    this.sandboxes.set(info.sandboxId, info);
    this.save().catch((err) => console.error('Failed to save state:', err));
  }

  getSandbox(sandboxId: string): VpsSandboxInfo | undefined {
    return this.sandboxes.get(sandboxId);
  }

  deleteSandbox(sandboxId: string): void {
    this.sandboxes.delete(sandboxId);
    this.save().catch((err) => console.error('Failed to save state:', err));
  }

  setDeployment(siteId: string, payload: VpsDeploymentRecord): void {
    this.deployments.set(siteId, payload);
    this.save().catch((err) => console.error('Failed to save state:', err));
  }

  getDeployment(siteId: string): VpsDeploymentRecord | undefined {
    return this.deployments.get(siteId);
  }

  deleteDeployment(siteId: string): void {
    this.deployments.delete(siteId);
    this.save().catch((err) => console.error('Failed to save state:', err));
  }

  get activeSandboxes(): number {
    return Array.from(this.sandboxes.values()).filter((s) => s.status !== 'terminated').length;
  }

  get activeDeployments(): number {
    return this.deployments.size;
  }
}
