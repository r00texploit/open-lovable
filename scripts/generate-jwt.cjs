import jwt from 'jsonwebtoken';

const secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
  console.error('NEXTAUTH_SECRET not set');
  process.exit(1);
}

// Generate a valid NextAuth JWT
const token = {
  id: 'cmq7yjttx0000ithtwjzt3og2',
  email: 'apitest@openlovable.dev',
  name: 'API Test User',
  sub: 'cmq7yjttx0000ithtwjzt3og2',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  jti: 'apitest-jwt-' + Date.now(),
};

const signed = jwt.sign(token, secret, { algorithm: 'HS256' });
console.log('JWT_TOKEN=' + signed);
