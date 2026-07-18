import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import { AgentStore } from '../src/store';
import { startPublicServer } from '../src/public-server';

test('public router serves registered hosts and rejects unknown hosts', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vps-router-'));
  await fs.writeFile(path.join(root, 'index.html'), '<h1>safe</h1>');
  const store = new AgentStore();
  store.routes = [{ host: 'site.example.com', target: { type: 'static', value: root }, siteId: 'site-1' }];
  const server = startPublicServer(store, 0, 'example.com');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(async () => { server.close(); await fs.rm(root, { recursive: true, force: true }); });
  const port = (server.address() as AddressInfo).port;

  const request = (host: string) => new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/', headers: { host } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
  });

  const ok = await request('site.example.com');
  assert.equal(ok.status, 200);
  assert.equal(ok.body, '<h1>safe</h1>');

  const unknown = await request('unknown.example.com');
  assert.equal(unknown.status, 404);
});
