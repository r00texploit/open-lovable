import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Check subscription for protected routes
    if (req.nextUrl.pathname.startsWith('/generation')) {
      const token = req.nextauth.token;

      // Allow if user has active subscription or is within free tier
      if (token?.subscription?.tier === 'free' && token?.usage?.generationsUsed >= token?.usage?.generationsLimit) {
        return NextResponse.redirect(new URL('/pricing', req.url));
      }
    }

    return NextResponse.next();
  },
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
