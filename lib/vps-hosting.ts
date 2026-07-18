/**
 * VPS-based domain hosting.
 *
 * Replaces lib/vercel.ts for custom-domain management. Instead of registering
 * domains with Vercel's project API, we tell the VPS agent to route incoming
 * Host headers to the right sandbox container or static site directory.
 */

import { domainSchema } from '@/lib/validations/site';
import { resolve4, resolveTxt } from 'node:dns/promises';

interface VpsDomainResult {
  name: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason?: string;
  }>;
}

function getAgentUrl() {
  const url = process.env.VPS_AGENT_URL;
  if (!url) throw new Error('VPS_AGENT_URL is not configured');
  return url.replace(/\/$/, '');
}

function getAgentToken() {
  const token = process.env.VPS_AGENT_TOKEN;
  if (!token) throw new Error('VPS_AGENT_TOKEN is not configured');
  return token;
}

async function agentFetch<T>(pathname: string, init?: RequestInit): Promise<T> {
  const requestTimeoutMs = Number(process.env.VPS_AGENT_REQUEST_TIMEOUT_MS) || 330_000;
  const response = await fetch(`${getAgentUrl()}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAgentToken()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    signal: init?.signal || AbortSignal.timeout(requestTimeoutMs),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { message?: string }).message ||
      (payload as { error?: { message?: string } }).error?.message ||
      `VPS agent request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

/**
 * Resolve the expected VPS IP from environment. Used for DNS verification.
 */
export function getVpsIp() {
  return process.env.VPS_PUBLIC_IP;
}

function verificationHost(domain: string) {
  return `_noeron-verification.${domain}`;
}

async function withDnsTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('DNS lookup timed out')), 5000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getVpsVerificationRecords(domain: string, token: string) {
  return [
    {
      type: 'TXT',
      domain: verificationHost(domain),
      value: token,
      reason: 'Proves control of this domain before Noeron enables routing and TLS',
    },
    {
      type: 'A',
      domain,
      value: getVpsIp() || 'Set an A record pointing to your VPS IP',
      reason: 'Routes the verified domain to the VPS',
    },
  ];
}

/**
 * Add a custom domain to a site.
 *
 * The agent clones the existing subdomain route (sandbox or static) so the
 * custom domain points to the same target.
 */
export async function addDomainToVps(domain: string, siteId: string, verificationToken: string): Promise<{ name: string }> {
  const name = domainSchema.parse(domain);
  await agentFetch<{ added: boolean }>('/domains', {
    method: 'POST',
    body: JSON.stringify({ domain: name, siteId, verificationToken }),
  });
  return { name };
}

export async function getVpsDomain(domain: string, verificationToken: string): Promise<VpsDomainResult> {
  const name = domainSchema.parse(domain);
  const routes = await agentFetch<{ routes: Array<{ host: string }> }>('/routes');
  const found = routes.routes.some((r) => r.host === name);
  const verified = found && await verifyVpsDomain(name, verificationToken);
  return {
    name,
    verified,
    verification: verified ? [] : getVpsVerificationRecords(name, verificationToken),
  };
}

export async function verifyVpsDomain(domain: string, verificationToken: string): Promise<boolean> {
  const name = domainSchema.parse(domain);
  const expectedIp = getVpsIp();
  if (!expectedIp || !verificationToken) {
    return false;
  }

  try {
    const [addresses, textRecords] = await Promise.all([
      withDnsTimeout(resolve4(name)),
      withDnsTimeout(resolveTxt(verificationHost(name))),
    ]);
    const tokens = textRecords.map((parts) => parts.join(''));
    return addresses.includes(expectedIp) && tokens.includes(verificationToken);
  } catch (error) {
    console.warn(`[vps-hosting] DNS verification failed for ${name}:`, error);
    return false;
  }
}

export async function removeDomainFromVps(domain: string): Promise<{ name: string }> {
  const name = domainSchema.parse(domain);
  await agentFetch<{ removed: boolean }>(`/domains/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  return { name };
}
