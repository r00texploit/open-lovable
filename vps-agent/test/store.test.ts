import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentStore } from '../src/store';

test('store persists deployment metadata without site file contents', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vps-store-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new AgentStore(dir);
  store.routes = [{ host: 'site.example.com', target: { type: 'static', value: '/releases/one' }, siteId: 'site-1' }];
  store.setDeployment('site-1', {
    siteId: 'site-1', subdomain: 'site', releaseDir: '/releases/one', deployedAt: new Date().toISOString(),
  });
  await store.save();
  const raw = await fs.readFile(path.join(dir, 'state.json'), 'utf8');
  assert.doesNotMatch(raw, /files|content/);
  const loaded = new AgentStore(dir);
  await loaded.load();
  assert.equal(loaded.getDeployment('site-1')?.releaseDir, '/releases/one');
  assert.equal(loaded.routes[0]?.host, 'site.example.com');
});
