import { domainSchema } from '@/lib/validations/site';

const VERCEL_API_BASE = 'https://api.vercel.com';

interface VercelProjectDomainResponse {
  name: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason?: string;
  }>;
}

function getProjectId() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID is not configured');
  }
  return projectId;
}

function getApiToken() {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error('VERCEL_API_TOKEN is not configured');
  }
  return token;
}

function getTeamId() {
  return process.env.VERCEL_TEAM_ID;
}

function buildApiUrl(pathname: string) {
  const url = new URL(`${VERCEL_API_BASE}${pathname}`);
  const teamId = getTeamId();
  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }
  return url;
}

async function vercelFetch<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(pathname), {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiToken()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string }; message?: string }).error?.message ||
      (payload as { message?: string }).message ||
      'Vercel API request failed';
    throw new Error(message);
  }

  return payload as T;
}

export async function addDomainToProject(domain: string) {
  const name = domainSchema.parse(domain);
  return vercelFetch<VercelProjectDomainResponse>(`/v10/projects/${getProjectId()}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getProjectDomain(domain: string) {
  const name = domainSchema.parse(domain);
  return vercelFetch<VercelProjectDomainResponse>(`/v9/projects/${getProjectId()}/domains/${name}`, {
    method: 'GET',
  });
}

export async function verifyProjectDomain(domain: string) {
  const name = domainSchema.parse(domain);
  return vercelFetch<VercelProjectDomainResponse>(`/v9/projects/${getProjectId()}/domains/${name}/verify`, {
    method: 'POST',
  });
}

export async function removeDomainFromProject(domain: string) {
  const name = domainSchema.parse(domain);
  return vercelFetch<{ name: string }>(`/v9/projects/${getProjectId()}/domains/${name}`, {
    method: 'DELETE',
  });
}
