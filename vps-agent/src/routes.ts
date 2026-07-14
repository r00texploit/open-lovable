import type { AgentStore } from './store';
import type { VpsRouteEntry, VpsSandboxInfo } from './types';

export function addSandboxRoutes(
  store: AgentStore,
  info: VpsSandboxInfo,
  baseDomain: string,
  subdomain?: string,
  customDomain?: string
): void {
  const hosts: string[] = [];
  if (subdomain) hosts.push(`${subdomain}.${baseDomain}`);
  if (customDomain) hosts.push(customDomain);

  removeSandboxRoutes(store, info.sandboxId);

  for (const host of hosts) {
    store.routes.push({
      host,
      target: { type: 'container', value: `${info.host}:${info.port}` },
      sandboxId: info.sandboxId
    });
  }

  store.save().catch((err) => console.error('Failed to save routes:', err));
}

export function removeSandboxRoutes(store: AgentStore, sandboxId: string): void {
  store.routes = store.routes.filter((r) => r.sandboxId !== sandboxId);
  store.save().catch((err) => console.error('Failed to save routes:', err));
}

export function addDeploymentRoutes(
  store: AgentStore,
  siteId: string,
  subdomain: string,
  customDomain: string | null | undefined,
  siteDir: string,
  baseDomain: string
): void {
  removeDeploymentRoutes(store, siteId);

  const hosts: string[] = [];
  if (subdomain) hosts.push(`${subdomain}.${baseDomain}`);
  if (customDomain) hosts.push(customDomain);

  for (const host of hosts) {
    store.routes.push({
      host,
      target: { type: 'static', value: siteDir },
      siteId
    });
  }

  store.save().catch((err) => console.error('Failed to save routes:', err));
}

export function removeDeploymentRoutes(store: AgentStore, siteId: string): void {
  store.routes = store.routes.filter((r) => r.siteId !== siteId);
  store.save().catch((err) => console.error('Failed to save routes:', err));
}

export function getRoutes(store: AgentStore): VpsRouteEntry[] {
  return store.routes;
}
