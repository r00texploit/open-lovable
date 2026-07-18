import type { AgentStore } from './store';
import type { VpsRouteEntry, VpsSandboxInfo } from './types';
import { normalizeHostname } from './security';

const DOMAIN_AUTHORIZATION_TTL_MS = 15 * 60 * 1000;

export function addSandboxRoutes(
  store: AgentStore,
  info: VpsSandboxInfo,
  baseDomain: string,
  subdomain?: string,
  _customDomain?: string
): void {
  const hosts: string[] = [];
  if (subdomain) hosts.push(normalizeHostname(`${subdomain}.${baseDomain}`));

  removeSandboxRoutes(store, info.sandboxId);

  for (const host of hosts) {
    store.routes.push({
      host,
      target: { type: 'container', value: `${info.host}:${info.port}` },
      sandboxId: info.sandboxId,
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
  _customDomain: string | null | undefined,
  siteDir: string,
  baseDomain: string
): void {
  removeDeploymentRoutes(store, siteId);

  const hosts: string[] = [];
  if (subdomain) hosts.push(normalizeHostname(`${subdomain}.${baseDomain}`));

  for (const host of hosts) {
    store.routes.push({
      host,
      target: { type: 'static', value: siteDir },
      siteId,
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

export function addDomainRoute(store: AgentStore, siteId: string, domain: string, verificationToken: string): boolean {
  const host = normalizeHostname(domain);
  const existing = store.routes.find((route) => route.siteId === siteId);
  if (!existing) return false;
  if (store.routes.some((route) => route.host === host && route.siteId !== siteId)) {
    throw new Error('Domain is already assigned');
  }
  store.routes = store.routes.filter((route) => route.host !== host);
  store.routes.push({
    ...existing,
    host,
    domainAuthorizationVersion: 1,
    domainVerificationToken: verificationToken,
    domainAuthorizationExpiresAt: new Date(Date.now() + DOMAIN_AUTHORIZATION_TTL_MS).toISOString(),
  });
  void store.save();
  return true;
}

export function isRouteAuthorized(route: VpsRouteEntry, baseDomain: string): boolean {
  if (route.host.endsWith(`.${normalizeHostname(baseDomain)}`)) return true;
  return route.domainAuthorizationVersion === 1
    && Boolean(route.domainVerificationToken)
    && Boolean(route.domainAuthorizationExpiresAt)
    && new Date(route.domainAuthorizationExpiresAt!).getTime() > Date.now();
}

export function refreshDomainRouteAuthorization(route: VpsRouteEntry): void {
  route.domainAuthorizationExpiresAt = new Date(Date.now() + DOMAIN_AUTHORIZATION_TTL_MS).toISOString();
}

export function removeDomainRoute(store: AgentStore, domain: string): boolean {
  const host = normalizeHostname(domain);
  const before = store.routes.length;
  store.routes = store.routes.filter((route) => route.host !== host);
  if (store.routes.length !== before) void store.save();
  return store.routes.length !== before;
}
