const DEFAULT_DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

function stripPort(value: string) {
  return value.replace(/:\d+$/, '').toLowerCase();
}

export function getRootDomain() {
  return process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'mydomain.com';
}

export function getPlatformAppHost() {
  return process.env.PLATFORM_APP_HOST || `app.${getRootDomain()}`;
}

export function normalizeHostname(hostname: string | null | undefined) {
  if (!hostname) {
    return getRootDomain();
  }

  return stripPort(hostname);
}

export function isLocalDevelopmentHost(hostname: string) {
  return DEFAULT_DEV_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

export function isRootDomainHost(hostname: string) {
  return hostname === getRootDomain();
}

export function isPlatformAppHost(hostname: string) {
  return hostname === getPlatformAppHost();
}

export function getSubdomainFromHostname(hostname: string) {
  const rootDomain = getRootDomain();
  if (!hostname.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const subdomain = hostname.slice(0, -1 * (`.${rootDomain}`.length));
  return subdomain || null;
}

export function isTenantSubdomainHost(hostname: string) {
  if (isRootDomainHost(hostname) || isPlatformAppHost(hostname) || isLocalDevelopmentHost(hostname)) {
    return false;
  }

  const subdomain = getSubdomainFromHostname(hostname);
  return !!subdomain;
}

export function isCustomDomainHost(hostname: string) {
  if (isRootDomainHost(hostname) || isPlatformAppHost(hostname) || isLocalDevelopmentHost(hostname)) {
    return false;
  }

  return !hostname.endsWith(`.${getRootDomain()}`);
}

export function encodeTenantHost(hostname: string) {
  return encodeURIComponent(hostname);
}

export function decodeTenantHost(value: string) {
  return decodeURIComponent(value);
}

export function buildTenantUrl(slug: string) {
  return `https://${slug}.${getRootDomain()}`;
}

export function getRequestHostname(headers: Headers) {
  return normalizeHostname(headers.get('x-forwarded-host') || headers.get('host'));
}
