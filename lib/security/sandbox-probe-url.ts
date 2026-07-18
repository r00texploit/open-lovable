import { isIP } from 'node:net';
import { resolve4, resolve6 } from 'node:dns/promises';

const PROVIDER_SUFFIXES: Record<string, string[]> = {
  vercel: ['.vercel.run', '.vercel-sandbox.dev'],
  e2b: ['.e2b.dev'],
};

function isPrivateIp(address: string): boolean {
  if (address === '::1' || address === '0:0:0:0:0:0:0:1') return true;
  if (address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe8') || address.startsWith('fe9') || address.startsWith('fea') || address.startsWith('feb')) return true;
  if (address.startsWith('::ffff:')) return isPrivateIp(address.slice(7));

  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = octets;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function hostnameAllowed(hostname: string, provider: string): boolean {
  if (provider === 'vps') {
    const baseDomain = (process.env.VPS_BASE_DOMAIN || process.env.ROOT_DOMAIN || '').toLowerCase();
    return !!baseDomain && hostname.endsWith(`.${baseDomain}`);
  }
  return (PROVIDER_SUFFIXES[provider] || []).some((suffix) => hostname.endsWith(suffix));
}

export async function assertSafeSandboxProbeUrl(rawUrl: string, provider: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid sandbox URL');
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('Sandbox URL must be a standard HTTPS URL');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostnameAllowed(hostname, provider)) {
    throw new Error('Sandbox URL hostname is not allowed for this provider');
  }
  if (isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('Private network sandbox probes are not allowed');
  }

  const addresses = await Promise.all([
    resolve4(hostname).catch(() => [] as string[]),
    resolve6(hostname).catch(() => [] as string[]),
  ]).then(([ipv4, ipv6]) => [...ipv4, ...ipv6]);
  if (!addresses.length || addresses.some(isPrivateIp)) {
    throw new Error('Sandbox hostname did not resolve to a public address');
  }
  return url;
}
