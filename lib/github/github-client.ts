import { prisma } from '@/lib/db/prisma';
import { encryptSecret, decryptSecret } from '@/lib/crypto/secret-box';

export interface GitHubConnection {
  id: string;
  siteId: string;
  scope: string;
  githubLogin: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
}

interface SealedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function sealToken(token: string): SealedToken {
  return encryptSecret(token);
}

function unsealToken(sealed: SealedToken): string {
  return decryptSecret(sealed);
}

const GITHUB_API = 'https://api.github.com';

function apiHeaders(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubFetch<T = any>(token: string, path: string, init?: RequestInit): Promise<T> {
  const url = `${GITHUB_API}${path}`;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...apiHeaders(token),
          ...(init?.headers || {}),
        },
      });

      if (response.status === 204) {
        return undefined as T;
      }

      if (!response.ok) {
        const body = await response.text();
        const error = new Error(`GitHub API ${response.status}: ${body.slice(0, 200)}`);
        // Only retry transient server/rate-limit errors, not 4xx client errors.
        if (RETRYABLE_STATUSES.includes(response.status) && attempt < MAX_RETRIES - 1) {
          lastError = error;
          const delay = INITIAL_RETRY_DELAY_MS * 2 ** attempt;
          console.warn(
            `[github-client] Transient ${response.status} for ${path}; retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
          );
          await sleep(delay);
          continue;
        }
        throw error;
      }

      return response.json() as T;
    } catch (error) {
      // Network-level errors (fetch failures) are also retryable.
      if (attempt < MAX_RETRIES - 1) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = INITIAL_RETRY_DELAY_MS * 2 ** attempt;
        console.warn(
          `[github-client] Request failed for ${path}; retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}): ${lastError.message}`
        );
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error(`GitHub API request failed after ${MAX_RETRIES} attempts: ${path}`);
}

/**
 * Store (or replace) an encrypted GitHub access token for a user/site.
 */
export async function storeGitHubConnection(params: {
  userId: string;
  siteId: string;
  accessToken: string;
  scope: string;
  githubLogin?: string;
  githubUserId?: string;
}): Promise<GitHubConnection> {
  const sealed = sealToken(params.accessToken);

  const row = await prisma.gitHubConnection.upsert({
    where: { siteId: params.siteId },
    create: {
      userId: params.userId,
      siteId: params.siteId,
      accessToken: sealed.ciphertext,
      iv: sealed.iv,
      authTag: sealed.authTag,
      scope: params.scope,
      githubLogin: params.githubLogin ?? null,
      githubUserId: params.githubUserId ?? null,
    },
    update: {
      userId: params.userId,
      accessToken: sealed.ciphertext,
      iv: sealed.iv,
      authTag: sealed.authTag,
      scope: params.scope,
      githubLogin: params.githubLogin ?? null,
      githubUserId: params.githubUserId ?? null,
    },
  });

  return {
    id: row.id,
    siteId: row.siteId,
    scope: row.scope,
    githubLogin: row.githubLogin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Retrieve and decrypt a stored GitHub token for a site. Returns null if none
 * exists or decryption fails.
 */
export async function getGitHubTokenForSite(
  userId: string,
  siteId: string
): Promise<{ token: string; connection: GitHubConnection } | null> {
  const row = await prisma.gitHubConnection.findFirst({
    where: { userId, siteId },
  });

  if (!row) return null;

  try {
    const token = unsealToken({
      ciphertext: row.accessToken,
      iv: row.iv,
      authTag: row.authTag,
    });

    return {
      token,
      connection: {
        id: row.id,
        siteId: row.siteId,
        scope: row.scope,
        githubLogin: row.githubLogin,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error) {
    console.error('[github-client] Failed to decrypt GitHub token:', error);
    return null;
  }
}

/**
 * Remove a stored GitHub connection.
 */
export async function removeGitHubConnection(userId: string, siteId: string): Promise<boolean> {
  const result = await prisma.gitHubConnection.deleteMany({
    where: { userId, siteId },
  });
  return result.count > 0;
}

/**
 * List the GitHub connections for a user.
 */
export async function listGitHubConnections(userId: string): Promise<GitHubConnection[]> {
  const rows = await prisma.gitHubConnection.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    siteId: row.siteId,
    scope: row.scope,
    githubLogin: row.githubLogin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * Exchange a GitHub OAuth code for an access token.
 */
export async function exchangeGitHubCode(code: string): Promise<{ accessToken: string; scope: string }> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth is not configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  if (!data.access_token) {
    throw new Error('GitHub did not return an access token');
  }

  return {
    accessToken: data.access_token,
    scope: data.scope || 'repo',
  };
}

/**
 * Build the GitHub OAuth authorization URL.
 */
export function buildGitHubAuthUrl(params: {
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID is not configured');
  }

  const scope = params.scope || 'repo';
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', params.state);
  return url.toString();
}

/**
 * Get the authenticated GitHub user's profile.
 */
export async function getGitHubUser(token: string): Promise<{ id: string; login: string }> {
  const user = await githubFetch<{ id: number; login: string }>(token, '/user');
  return { id: String(user.id), login: user.login };
}

/**
 * Get a repo by owner/name.
 */
export async function getRepo(token: string, owner: string, repo: string): Promise<GitHubRepo | null> {
  try {
    const data = await githubFetch<any>(token, `/repos/${owner}/${repo}`);
    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      private: data.private,
      htmlUrl: data.html_url,
      defaultBranch: data.default_branch,
    };
  } catch (error: any) {
    if (error.message.includes('404')) return null;
    throw error;
  }
}

/**
 * Create a new repo for the authenticated user.
 */
export async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean = true
): Promise<GitHubRepo> {
  const data = await githubFetch<any>(token, '/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: true,
      description: `Generated by Noeron`,
    }),
  });

  return {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    private: data.private,
    htmlUrl: data.html_url,
    defaultBranch: data.default_branch || 'main',
  };
}

/**
 * Ensure a repo exists, creating it if necessary. Returns the default branch.
 */
export async function ensureRepo(
  token: string,
  owner: string,
  repo: string,
  createIfMissing: boolean = true
): Promise<GitHubRepo> {
  const existing = await getRepo(token, owner, repo);
  if (existing) return existing;
  if (!createIfMissing) throw new Error(`Repo ${owner}/${repo} not found`);

  // If owner is the authenticated user, create under user repos.
  const user = await getGitHubUser(token);
  if (owner.toLowerCase() !== user.login.toLowerCase()) {
    throw new Error(`Cannot create repo under organization ${owner} from this flow`);
  }

  return createRepo(token, repo);
}

/**
 * Get the default branch ref and current tree SHA for a repo/branch.
 */
async function getBranchRef(token: string, owner: string, repo: string, branch: string): Promise<{ ref: string; sha: string }> {
  const data = await githubFetch<any>(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  return { ref: data.ref, sha: data.object.sha };
}

/**
 * Get file contents at a path. Returns null if the file does not exist.
 */
async function getRepoFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const query = branch ? `?ref=${encodeURIComponent(branch)}` : '';
    const data = await githubFetch<any>(token, `/repos/${owner}/${repo}/contents/${path}${query}`);
    if (Array.isArray(data) || !data.content) return null;
    return {
      content: Buffer.from(data.content, 'base64').toString('utf8'),
      sha: data.sha,
    };
  } catch (error: any) {
    if (error.message.includes('404')) return null;
    throw error;
  }
}

/**
 * Push a single file to a repo. Creates or updates the file.
 */
async function pushFile(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  const existing = await getRepoFile(token, owner, repo, path, branch);
  const body: any = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
  };
  if (existing?.sha) {
    body.sha = existing.sha;
  }

  await githubFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Push a batch of files to a repo. Files is a map of repo-relative path to content.
 */
export async function pushFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: Record<string, string>,
  commitMessage: string = 'Update from Noeron'
): Promise<{ pushed: string[]; failed: string[] }> {
  const pushed: string[] = [];
  const failed: string[] = [];

  for (const [path, content] of Object.entries(files)) {
    try {
      await pushFile(token, owner, repo, branch, path, content, commitMessage);
      pushed.push(path);
    } catch (error) {
      console.error(`[github-client] Failed to push ${path}:`, error);
      failed.push(path);
    }
  }

  return { pushed, failed };
}

/**
 * Recursively list files in a repo directory.
 */
async function listRepoTree(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string = ''
): Promise<Array<{ path: string; content: string }>> {
  const query = path ? `?ref=${encodeURIComponent(branch)}` : '';
  const data = await githubFetch<any>(
    token,
    `/repos/${owner}/${repo}/contents/${path}${query}`
  );

  if (!Array.isArray(data)) return [];

  const files: Array<{ path: string; content: string }> = [];

  for (const item of data) {
    if (item.type === 'dir') {
      const nested = await listRepoTree(token, owner, repo, branch, item.path);
      files.push(...nested);
    } else if (item.type === 'file' && item.download_url) {
      try {
        const response = await fetch(item.download_url, { headers: apiHeaders(token) });
        if (response.ok) {
          files.push({ path: item.path, content: await response.text() });
        }
      } catch (error) {
        console.warn(`[github-client] Failed to download ${item.path}:`, error);
      }
    }
  }

  return files;
}

/**
 * Pull all text files from a repo branch. Returns a map of repo-relative path to content.
 */
export async function pullFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  basePath: string = ''
): Promise<Record<string, string>> {
  const files = await listRepoTree(token, owner, repo, branch, basePath);
  return Object.fromEntries(files.map((f) => [f.path, f.content]));
}

/**
 * Push a scoped set of files to the default GitHub repo for a site.
 * The default repo is named `noeron-{siteSlug}` under the authenticated user.
 * Creates the repo if it does not exist.
 */
export async function pushSiteChanges(
  token: string,
  siteSlug: string,
  files: Record<string, string>,
  commitMessage: string = 'Update from Noeron'
): Promise<{
  repo: GitHubRepo;
  pushed: string[];
  failed: string[];
}> {
  const user = await getGitHubUser(token);
  const owner = user.login;
  const repoName = `noeron-${siteSlug}`;
  const repo = await ensureRepo(token, owner, repoName, true);

  const result = await pushFiles(
    token,
    repo.owner,
    repo.name,
    repo.defaultBranch,
    files,
    commitMessage
  );

  return { repo, ...result };
}
