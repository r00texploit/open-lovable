import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  encodeTenantHost,
  getRequestHostname,
  isCustomDomainHost,
  isPlatformAppHost,
  isTenantSubdomainHost,
} from '@/lib/tenancy/hostname';

const PUBLIC_FILE = /\.(.*)$/;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/site-host') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/brand') ||
    pathname.startsWith('/site-preview') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hostname = getRequestHostname(request.headers);

  // Debug logging
  console.log('[proxy] Request:', { hostname, pathname });
  console.log('[proxy] Checks:', {
    isTenantSubdomain: isTenantSubdomainHost(hostname),
    isCustomDomain: isCustomDomainHost(hostname),
    isPlatformApp: isPlatformAppHost(hostname),
  });
  // Derive the cookie name from the actual request protocol instead of
  // NEXTAUTH_URL — a stale/localhost NEXTAUTH_URL otherwise makes getToken
  // look for the non-__Secure cookie and treat logged-in users as guests.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie:
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https',
  });
  const isProtectedPath =
    pathname.startsWith('/generation') ||
    pathname.startsWith('/settings') ||
    (isPlatformAppHost(hostname) && pathname === '/');

  if (isProtectedPath && !token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname === '/' ? '/generation' : pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isPlatformAppHost(hostname) && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/generation';
    return NextResponse.rewrite(url);
  }

  // Explicitly exclude www and root domain from tenant routing
  const rootDomain = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'noeron.net';
  if (hostname === `www.${rootDomain}` || hostname === rootDomain) {
    console.log('[proxy] Serving landing page for:', hostname);
    return NextResponse.next();
  }

  if (isTenantSubdomainHost(hostname) || isCustomDomainHost(hostname)) {
    console.log('[proxy] Rewriting to site-host:', hostname);
    const url = request.nextUrl.clone();
    url.pathname = `/site-host/${encodeTenantHost(hostname)}${pathname}`;
    return NextResponse.rewrite(url);
  }

  console.log('[proxy] Serving landing page (default):', hostname);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
