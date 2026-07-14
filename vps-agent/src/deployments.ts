import fs from 'fs/promises';
import path from 'path';
import type { VpsDeploymentPayload } from './types';
import type { AgentStore } from './store';
import { addDeploymentRoutes, removeDeploymentRoutes } from './routes';

const DATA_DIR = process.env.VPS_DATA_DIR ?? '/data/vps-agent';
const SITES_DIR = path.join(DATA_DIR, 'sites');
const BASE_DOMAIN = process.env.VPS_BASE_DOMAIN ?? 'localhost';

export function getSiteDir(siteId: string): string {
  return path.join(SITES_DIR, siteId);
}

export async function createOrUpdateDeployment(
  store: AgentStore,
  payload: VpsDeploymentPayload
): Promise<void> {
  const siteDir = getSiteDir(payload.siteId);
  await fs.mkdir(siteDir, { recursive: true });

  // Remove existing files so the deployment is a clean overwrite.
  await fs.rm(siteDir, { recursive: true, force: true });
  await fs.mkdir(siteDir, { recursive: true });

  for (const file of payload.files) {
    const relativePath = file.path.replace(/^\/+/, '');
    const fullPath = path.join(siteDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const decoded = file.encoding === 'base64'
      ? Buffer.from(file.content, 'base64')
      : Buffer.from(file.content, 'utf8');
    await fs.writeFile(fullPath, decoded);
  }

  store.setDeployment(payload.siteId, payload);
  addDeploymentRoutes(store, payload.siteId, payload.subdomain, payload.customDomain, siteDir, BASE_DOMAIN);
}

export async function removeDeployment(store: AgentStore, siteId: string): Promise<void> {
  const siteDir = getSiteDir(siteId);
  await fs.rm(siteDir, { recursive: true, force: true });
  removeDeploymentRoutes(store, siteId);
  store.deleteDeployment(siteId);
}
