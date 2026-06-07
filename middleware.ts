import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware() {},
  {
    callbacks: {
      authorized({ req, token }) {
        // Require auth for protected routes
        if (req.nextUrl.pathname.startsWith('/generation') ||
            req.nextUrl.pathname.startsWith('/settings')) {
          return token !== null;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/generation/:path*', '/settings/:path*'],
};
