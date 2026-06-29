import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRootDomain, isRootDomainHost, isPlatformAppHost } from '@/lib/tenancy/hostname';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const rootDomain = getRootDomain();

  // Strip port if present
  const cleanHostname = hostname.replace(/:\d+$/, '');

  // If this is the root domain or www subdomain, let it proceed to page.tsx
  if (cleanHostname === rootDomain || cleanHostname === `www.${rootDomain}`) {
    return NextResponse.next();
  }

  // If this is the app subdomain (app.noeron.net), let it proceed
  if (isPlatformAppHost(cleanHostname)) {
    return NextResponse.next();
  }

  // For tenant subdomains (user-site.noeron.net), also let them proceed
  // They should be handled by the site-host route or their own routing
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
