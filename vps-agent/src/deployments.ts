import fs from 'fs/promises';
import path from 'path';
import type { VpsDeploymentPayload } from './types';
import type { AgentStore } from './store';
import { addDeploymentRoutes, removeDeploymentRoutes } from './routes';
import { assertSafeId, resolveContainedPath } from './security';

const DATA_DIR = process.env.VPS_DATA_DIR ?? '/data/vps-agent';
const SITES_DIR = path.join(DATA_DIR, 'sites');
const BASE_DOMAIN = process.env.VPS_BASE_DOMAIN ?? 'localhost';

export function getSiteDir(siteId: string): string {
  return path.join(SITES_DIR, assertSafeId(siteId, 'site ID'));
}

export async function createOrUpdateDeployment(
  store: AgentStore,
  payload: VpsDeploymentPayload
): Promise<void> {
  const siteDir = getSiteDir(payload.siteId);
  const releasesDir = path.join(siteDir, 'releases');
  const releaseDir = path.join(releasesDir, `${Date.now()}-${crypto.randomUUID()}`);
  await fs.mkdir(releaseDir, { recursive: true });

  try {
    for (const file of payload.files) {
      const fullPath = resolveContainedPath(releaseDir, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      const decoded = file.encoding === 'base64'
        ? Buffer.from(file.content, 'base64')
        : Buffer.from(file.content, 'utf8');
      await fs.writeFile(fullPath, decoded);
    }
    await fs.access(path.join(releaseDir, 'index.html'));
  } catch (error) {
    await fs.rm(releaseDir, { recursive: true, force: true });
    throw error;
  }

  // Activate only after every file is durable. Requests continue using the
  // previous release until this in-memory route swap occurs.
  store.setDeployment(payload.siteId, {
    siteId: payload.siteId,
    subdomain: payload.subdomain,
    customDomain: payload.customDomain,
    releaseDir,
    deployedAt: new Date().toISOString(),
  });
  addDeploymentRoutes(store, payload.siteId, payload.subdomain, payload.customDomain, releaseDir, BASE_DOMAIN);
  await store.save();

  const releases = await fs.readdir(releasesDir).catch(() => []);
  await Promise.all(releases
    .filter((name) => path.join(releasesDir, name) !== releaseDir)
    .map((name) => fs.rm(resolveContainedPath(releasesDir, name), { recursive: true, force: true })));
}

export async function removeDeployment(store: AgentStore, siteId: string): Promise<void> {
  const siteDir = getSiteDir(siteId);
  await fs.rm(siteDir, { recursive: true, force: true });
  removeDeploymentRoutes(store, siteId);
  store.deleteDeployment(siteId);
}
