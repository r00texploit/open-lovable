import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHostname, resolveContainedPath, resolvePosixContainedPath } from '../src/security';

test('deployment paths remain inside their site root', () => {
  assert.equal(resolveContainedPath('/data/sites/abc', '/assets/app.js'), '/data/sites/abc/assets/app.js');
  assert.throws(() => resolveContainedPath('/data/sites/abc', '../../state.json'), /escapes/);
  assert.throws(() => resolveContainedPath('/data/sites/abc', '/../../../etc/passwd'), /escapes/);
});

test('sandbox paths remain inside the workspace', () => {
  assert.equal(resolvePosixContainedPath('/vercel/sandbox', 'src/App.tsx'), '/vercel/sandbox/src/App.tsx');
  assert.equal(resolvePosixContainedPath('/vercel/sandbox', '/vercel/sandbox/src/App.tsx'), '/vercel/sandbox/src/App.tsx');
  assert.throws(() => resolvePosixContainedPath('/vercel/sandbox', '/etc/passwd'), /escapes/);
  assert.throws(() => resolvePosixContainedPath('/vercel/sandbox', '../secret'), /escapes/);
});

test('hostnames are normalized and invalid values rejected', () => {
  assert.equal(normalizeHostname('Site.Example.COM.'), 'site.example.com');
  assert.throws(() => normalizeHostname('example.com:443'), /Invalid/);
  assert.throws(() => normalizeHostname('../example.com'), /Invalid/);
});
