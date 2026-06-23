const { encode, decode } = require('next-auth/jwt');

async function test() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('NEXTAUTH_SECRET not set');
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = {
    id: 'cmq7yjttx0000ithtwjzt3og2',
    email: 'apitest@openlovable.dev',
    name: 'API Test User',
    sub: 'cmq7yjttx0000ithtwjzt3og2',
    iat: now,
    exp: now + 30 * 24 * 60 * 60,
  };

  console.log('Secret length:', secret.length);
  console.log('Token:', JSON.stringify(token));

  try {
    const encrypted = await encode({ token, secret, maxAge: 30 * 24 * 60 * 60 });
    console.log('Encrypted length:', encrypted.length);
    console.log('Encrypted prefix:', encrypted.slice(0, 30));

    const decrypted = await decode({ token: encrypted, secret });
    console.log('Decrypted:', decrypted ? 'YES' : 'NO');
    if (decrypted) {
      console.log('Payload:', JSON.stringify(decrypted, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
