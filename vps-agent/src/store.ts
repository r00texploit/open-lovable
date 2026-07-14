import fs from 'fs/promises';
import path from 'path';
import type { VpsSandboxInfo, VpsRouteEntry, VpsDeploymentPayload } from './types';

const DATA_DIR = process.env.VPS_DATA_DIR ?? '/data/vps-agent';
const STATE_FILE = path.join(DATA_DIR, 'state.json');

interface PersistedState {
  sandboxes: Record<string, VpsSandboxInfo>;
  deployments: Record<string, VpsDeploymentPayload>;
  routes: VpsRouteEntry[];
}

export class AgentStore {
  sandboxes: Map<string, VpsSandboxInfo> = new Map();
  deployments: Map<string, VpsDeploymentPayload> = new Map();
  routes: VpsRouteEntry[] = [];

  constructor() {
    this.load().catch((err) => console.error('Failed to load state:', err));
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  async load(): Promise<void> {
    try {
      await this.ensureDir();
      const raw = await fs.readFile(STATE_FILE, 'utf8');
      const state: PersistedState = JSON.parse(raw);
      this.sandboxes = new Map(Object.entries(state.sandboxes ?? {}));
      this.deployments = new Map(Object.entries(state.deployments ?? {}));
      this.routes = state.routes ?? [];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async save(): Promise<void> {
    await this.ensureDir();
    const state: PersistedState = {
      sandboxes: Object.fromEntries(this.sandboxes),
      deployments: Object.fromEntries(this.deployments),
      routes: this.routes
    };
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
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

  setDeployment(siteId: string, payload: VpsDeploymentPayload): void {
    this.deployments.set(siteId, payload);
    this.save().catch((err) => console.error('Failed to save state:', err));
  }

  getDeployment(siteId: string): VpsDeploymentPayload | undefined {
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
