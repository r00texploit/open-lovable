import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentStore } from '../src/store';
import { addDeploymentRoutes, addDomainRoute, isRouteAuthorized } from '../src/routes';

test('custom-domain routes carry explicit ownership authorization metadata', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vps-routes-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new AgentStore(dir);

  addDeploymentRoutes(store, 'site-1', 'site', undefined, '/releases/one', 'example.com');
  assert.equal(store.routes[0]?.host, 'site.example.com');
  assert.equal(store.routes[0]?.domainAuthorizationVersion, undefined);

  const token = 'abcdefghijklmnopqrstuvwxyzABCDEF1234567890';
  assert.equal(addDomainRoute(store, 'site-1', 'customer.test', token), true);
  const custom = store.routes.find((route) => route.host === 'customer.test');
  assert.equal(custom?.domainAuthorizationVersion, 1);
  assert.equal(custom?.domainVerificationToken, token);
  assert.equal(isRouteAuthorized(custom!, 'example.com'), true);
  await store.save();
});
