const required = [
  'DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL',
  'ROOT_DOMAIN', 'NEXT_PUBLIC_ROOT_DOMAIN', 'PLATFORM_APP_HOST',
  'SECRETS_ENCRYPTION_KEY', 'VPS_AGENT_TOKEN', 'VPS_BASE_DOMAIN', 'VPS_PUBLIC_IP',
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing required production environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.NEXTAUTH_SECRET.length < 32 || process.env.VPS_AGENT_TOKEN.length < 32) {
  console.error('NEXTAUTH_SECRET and VPS_AGENT_TOKEN must each be at least 32 characters');
  process.exit(1);
}
if (process.env.ROOT_DOMAIN !== process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.VPS_BASE_DOMAIN !== process.env.ROOT_DOMAIN) {
  console.error('ROOT_DOMAIN, NEXT_PUBLIC_ROOT_DOMAIN, and VPS_BASE_DOMAIN must match');
  process.exit(1);
}
if (process.env.PLATFORM_APP_HOST !== process.env.ROOT_DOMAIN) {
  console.error('PLATFORM_APP_HOST must equal ROOT_DOMAIN for the included Caddy topology');
  process.exit(1);
}
if (process.env.SANDBOX_PROVIDER !== 'vps') {
  console.error('SANDBOX_PROVIDER must be vps in this production image');
  process.exit(1);
}

await import('./server.js');
