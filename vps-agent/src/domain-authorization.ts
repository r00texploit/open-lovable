import { resolve4, resolveTxt } from 'node:dns/promises';
import type { AgentStore } from './store';
import { refreshDomainRouteAuthorization } from './routes';

const LOOKUP_TIMEOUT_MS = 5000;

async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('DNS lookup timed out')), LOOKUP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function stillOwnsDomain(domain: string, token: string, expectedIp: string): Promise<boolean> {
  try {
    const [addresses, records] = await Promise.all([
      withTimeout(resolve4(domain)),
      withTimeout(resolveTxt(`_noeron-verification.${domain}`)),
    ]);
    return addresses.includes(expectedIp) && records.some((parts) => parts.join('') === token);
  } catch {
    return false;
  }
}

export async function revalidateCustomDomainRoutes(store: AgentStore, expectedIp: string): Promise<void> {
  const customRoutes = store.routes.filter((route) => route.domainAuthorizationVersion === 1);
  const validity = await Promise.all(customRoutes.map(async (route) => ({
    route,
    valid: Boolean(route.domainVerificationToken)
      && await stillOwnsDomain(route.host, route.domainVerificationToken!, expectedIp),
  })));

  const invalidHosts = new Set(validity.filter(({ valid }) => !valid).map(({ route }) => route.host));
  for (const { route, valid } of validity) {
    if (valid) refreshDomainRouteAuthorization(route);
  }
  if (invalidHosts.size) {
    store.routes = store.routes.filter((route) => !invalidHosts.has(route.host));
  }
  if (customRoutes.length) await store.save();
}
