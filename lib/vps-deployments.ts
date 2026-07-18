/**
 * VPS static-site deployment client.
 *
 * Publishes built site snapshots to the VPS agent, which serves them from a
 * directory and routes the site's subdomain (and any custom domain) to them.
 */

import type { VpsDeploymentPayload, VpsFileWrite } from './sandbox/providers/vps-types';

interface AgentError {
  message: string;
  code?: string;
}

class VpsAgentRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
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
      (payload as AgentError).message ||
      (payload as { error?: { message?: string } }).error?.message ||
      (typeof (payload as { error?: unknown }).error === 'string' ? (payload as { error: string }).error : undefined) ||
      `VPS agent request failed: ${response.status}`;
    throw new VpsAgentRequestError(message, response.status);
  }
  return payload as T;
}

export async function isSandboxActiveOnVps(sandboxId: string): Promise<boolean> {
  try {
    const info = await agentFetch<{ status: string }>(`/sandboxes/${encodeURIComponent(sandboxId)}`);
    return info.status === 'running' || info.status === 'creating';
  } catch (error) {
    if (error instanceof VpsAgentRequestError && error.status === 404) return false;
    throw error;
  }
}

export function isVpsDeploymentEnabled(): boolean {
  return (
    process.env.SANDBOX_PROVIDER === 'vps' ||
    process.env.VPS_DEPLOYMENTS_ENABLED === 'true'
  );
}

export async function deployStaticSiteToVps(
  siteId: string,
  subdomain: string,
  files: Array<{ path: string; contentType: string; content: Buffer; size: number }>,
): Promise<{ deployed: boolean; url: string }> {
  const baseDomain = process.env.VPS_BASE_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'noeron.net';
  const url = `https://${subdomain}.${baseDomain}`;

  const payload: VpsDeploymentPayload = {
    siteId,
    subdomain,
    files: files.map((file) => {
      const isBinary = !/\.(html|css|js|mjs|json|svg|xml|txt|md|yaml|yml)$/i.test(file.path);
      return {
        path: file.path,
        content: isBinary ? file.content.toString('base64') : file.content.toString('utf-8'),
        encoding: isBinary ? 'base64' : 'utf8',
      } as VpsFileWrite;
    }),
  };

  await agentFetch<{ deployed: boolean }>('/deployments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return { deployed: true, url };
}

export async function undeployStaticSiteFromVps(siteId: string): Promise<{ removed: boolean }> {
  const result = await agentFetch<{ removed: boolean }>(`/deployments/${encodeURIComponent(siteId)}`, {
    method: 'DELETE',
  });
  return result;
}

export async function terminateSandboxOnVps(sandboxId: string): Promise<{ removed: boolean }> {
  const result = await agentFetch<{ removed: boolean }>(`/sandboxes/${encodeURIComponent(sandboxId)}`, {
    method: 'DELETE',
  });
  return result;
}
