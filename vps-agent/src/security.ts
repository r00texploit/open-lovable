import path from 'path';

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function assertSafeId(value: string, label: string): string {
  if (!ID_PATTERN.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

export function normalizeHostname(value: string): string {
  const host = value.trim().toLowerCase().replace(/\.$/, '');
  if (!HOST_PATTERN.test(host)) throw new Error('Invalid hostname');
  return host;
}

export function resolveContainedPath(root: string, requestedPath: string): string {
  if (requestedPath.includes('\0')) throw new Error('Invalid path');
  const normalizedRoot = path.resolve(root);
  const relative = requestedPath.replace(/^[/\\]+/, '');
  const resolved = path.resolve(normalizedRoot, relative);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error('Path escapes the allowed root');
  }
  return resolved;
}

export function resolvePosixContainedPath(root: string, requestedPath: string): string {
  if (requestedPath.includes('\0')) throw new Error('Invalid path');
  const normalizedRoot = path.posix.resolve('/', root);
  const resolved = requestedPath.startsWith('/')
    ? path.posix.resolve('/', requestedPath)
    : path.posix.resolve(normalizedRoot, requestedPath);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}/`)) {
    throw new Error('Path escapes the sandbox workspace');
  }
  return resolved;
}
