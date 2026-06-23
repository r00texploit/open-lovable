async function main() {
  const { getToken } = await import('next-auth/jwt');
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('NEXTAUTH_SECRET not set');
    process.exit(1);
  }

  const jwt = process.argv[2];
  if (!jwt) {
    console.error('Usage: node test-nextauth-parse.cjs <jwt>');
    process.exit(1);
  }

  // Create a mock Next.js request
  const mockReq = {
    headers: {},
    cookies: {
      get: (name) => {
        if (name === 'next-auth.session-token') {
          return { value: jwt };
        }
        return undefined;
      }
    }
  };

  const token = await getToken({ req: mockReq, secret });
  console.log('Token parsed:', !!token);
  if (token) {
    console.log('Token:', JSON.stringify(token, null, 2));
  } else {
    console.log('Token is null — signature or claims invalid');
  }
}

main().catch(console.error);
