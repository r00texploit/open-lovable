const { encode } = require('next-auth/jwt');
const fs = require('fs');
const path = require('path');

function getSecret() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^NEXTAUTH_SECRET\s*=\s*(.+)$/m);
    if (match) {
      let secret = match[1].trim();
      if ((secret.startsWith('"') && secret.endsWith('"')) ||
          (secret.startsWith("'") && secret.endsWith("'"))) {
        secret = secret.slice(1, -1);
      }
      return secret;
    }
  }
  throw new Error('NEXTAUTH_SECRET not found');
}

async function getTestJWT() {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const token = {
    id: 'cmq7yjttx0000ithtwjzt3og2',
    email: 'apitest@openlovable.dev',
    name: 'API Test User',
    sub: 'cmq7yjttx0000ithtwjzt3og2',
    iat: now,
    exp: now + 30 * 24 * 60 * 60,
    jti: 'apitest-jwt-' + now,
  };
  return encode({ token, secret, maxAge: 30 * 24 * 60 * 60 });
}

async function runTests() {
  const BASE = 'http://127.0.0.1:3000';
  const jwt = await getTestJWT();
  const cookie = `next-auth.session-token=${jwt}`;
  let pass = 0;
  let fail = 0;

  async function test(name, method, path, expectStatus, opts = {}) {
    const headers = opts.auth ? { Cookie: cookie } : {};
    if (opts.body) headers['Content-Type'] = 'application/json';
    const res = await fetch(BASE + path, { method, headers, body: opts.body });
    const ok = res.status === expectStatus;
    if (ok) { pass++; console.log(`  PASS: ${name}`); }
    else { fail++; console.log(`  FAIL: ${name} — got ${res.status}, expected ${expectStatus}`); }
    if (opts.expectJson) {
      const json = await res.json().catch(() => ({}));
      if (!json.success && !json.sessions && !json.usage && !json.subscription && !json.sites && res.status === 200) {
        console.log(`  WARN: ${name} returned unexpected body:`, JSON.stringify(json).slice(0, 100));
      }
    }
  }

  console.log('\n=== PUBLIC API TESTS ===');
  await test('GET / (home)', 'GET', '/', 200);
  await test('POST /api/scrape-website', 'POST', '/api/scrape-website', 200, { body: JSON.stringify({ url: 'https://example.com' }) });
  await test('GET /api/probe-url', 'GET', '/api/probe-url?url=https://example.com', 200);

  console.log('\n=== AUTHENTICATED API TESTS ===');
  await test('GET /api/generation-session (auth)', 'GET', '/api/generation-session', 200, { auth: true, expectJson: true });
  await test('GET /api/usage (auth)', 'GET', '/api/usage', 200, { auth: true, expectJson: true });
  await test('GET /api/sites (auth)', 'GET', '/api/sites', 200, { auth: true, expectJson: true });
  await test('GET /api/subscription (auth)', 'GET', '/api/subscription', 200, { auth: true, expectJson: true });
  await test('GET /builder (auth)', 'GET', '/builder', 200, { auth: true });

  console.log('\n=== UNAUTHENTICATED (should 401) ===');
  await test('GET /api/generation-session (no auth)', 'GET', '/api/generation-session', 401);
  await test('GET /api/usage (no auth)', 'GET', '/api/usage', 401);
  await test('GET /api/sites (no auth)', 'GET', '/api/sites', 401);
  await test('GET /api/subscription (no auth)', 'GET', '/api/subscription', 401);

  console.log('\n=== RATE LIMITING ===');
  let rateLimitHit = false;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(BASE + '/api/usage', { headers: { Cookie: cookie } });
    if (res.status === 429) { rateLimitHit = true; break; }
  }
  if (rateLimitHit) { pass++; console.log('  PASS: Rate limiting works (429 received)'); }
  else { fail++; console.log('  FAIL: Rate limiting — no 429 received after 15 requests'); }

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
