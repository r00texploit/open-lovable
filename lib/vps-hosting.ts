/**
 * VPS-based domain hosting.
 *
 * Replaces lib/vercel.ts for custom-domain management. Instead of registering
 * domains with Vercel's project API, we tell the VPS agent to route incoming
 * Host headers to the right sandbox container or static site directory.
 */

import { domainSchema } from '@/lib/validations/site';

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
  const response = await fetch(`${getAgentUrl()}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAgentToken()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
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

/**
 * Add a custom domain to a site.
 *
 * The agent clones the existing subdomain route (sandbox or static) so the
 * custom domain points to the same target.
 */
export async function addDomainToVps(domain: string, siteId: string): Promise<VpsDomainResult> {
  const name = domainSchema.parse(domain);
  await agentFetch<{ added: boolean }>('/domains', {
    method: 'POST',
    body: JSON.stringify({ domain: name, siteId }),
  });
  const verified = await verifyVpsDomain(name);
  return {
    name,
    verified,
    verification: verified
      ? []
      : [
          {
            type: 'A',
            domain: name,
            value: getVpsIp() || 'Set an A record pointing to your VPS IP',
            reason: 'Domain must resolve to the VPS IP',
          },
        ],
  };
}

export async function getVpsDomain(domain: string): Promise<VpsDomainResult> {
  const name = domainSchema.parse(domain);
  const routes = await agentFetch<{ routes: Array<{ host: string }> }>('/routes');
  const found = routes.routes.some((r) => r.host === name);
  const verified = found ? await verifyVpsDomain(name) : false;
  return {
    name,
    verified,
    verification: verified
      ? []
      : [
          {
            type: 'A',
            domain: name,
            value: getVpsIp() || 'Set an A record pointing to your VPS IP',
            reason: 'Domain must resolve to the VPS IP',
          },
        ],
  };
}

export async function verifyVpsDomain(domain: string): Promise<boolean> {
  const name = domainSchema.parse(domain);
  const expectedIp = getVpsIp();
  if (!expectedIp) {
    // Without a known VPS IP we cannot verify automatically; fall back to a
    // connectivity check against the agent's /routes endpoint.
    try {
      const routes = await agentFetch<{ routes: Array<{ host: string }> }>('/routes');
      return routes.routes.some((r) => r.host === name);
    } catch {
      return false;
    }
  }

  try {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=A`, {
      cache: 'no-store',
    });
    const data = (await response.json()) as { Answer?: Array<{ data: string }> };
    const answers = data.Answer?.map((a) => a.data) || [];
    return answers.includes(expectedIp);
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
