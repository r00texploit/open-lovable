// API Endpoints Test Stub
// Replace with real tests using a test framework like vitest or jest

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${name} - ${err.message}`);
      failed++;
    }
  }

  console.log('Running API endpoint tests...');

  await test('GET /api/sandbox-status returns 401 without session', async () => {
    const res = await fetch(`${BASE_URL}/api/sandbox-status`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('GET /api/generation-session returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/generation-session`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('GET /api/probe-url rejects unauthenticated probes', async () => {
    const res = await fetch(`${BASE_URL}/api/probe-url?sandboxId=unowned`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('POST /api/restore-files rejects unauthenticated restores', async () => {
    const res = await fetch(`${BASE_URL}/api/restore-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId: 'unowned' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('GET /builder redirects to signin without auth', async () => {
    const res = await fetch(`${BASE_URL}/builder`, { redirect: 'manual' });
    if (res.status !== 307) throw new Error(`Expected 307, got ${res.status}`);
    const location = res.headers.get('location');
    if (!location?.includes('signin')) throw new Error('Expected redirect to signin');
  });

  await test('POST /api/scrape-website scrapes example.com', async () => {
    const res = await fetch(`${BASE_URL}/api/scrape-website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    const body = await res.json();
    if (!body.success) throw new Error('Expected success=true');
    if (!body.data?.title) throw new Error('Expected data.title');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
