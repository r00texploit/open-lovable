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

// ── In-memory rate limiter (replace with Redis in production) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Static / internal bypass ──
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/site-host') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/brand') ||
    pathname.startsWith('/site-preview') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ── API route protection + rate limiting ──
  if (pathname.startsWith('/api')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    const publicApiPaths = [
      '/api/scrape-website',
      '/api/search',
      '/api/probe-url',
      '/api/auth',
    ];
    const isPublicApi = publicApiPaths.some((p) => pathname.startsWith(p));

    if (isPublicApi) {
      const rl = checkRateLimit(`api-public:${ip}:${pathname}`, 60, 60000);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many requests', retryAfter: rl.retryAfter },
          { status: 429 }
        );
      }
      return NextResponse.next();
    }

    // Use direct cookie read + decode because NextAuth v4 getToken() doesn't
    // fully support Next.js 15 App Router cookie API
    let token: any = null;
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value;
    if (sessionCookie) {
      try {
        const { decode } = await import('next-auth/jwt');
        token = await decode({
          token: sessionCookie,
          secret: process.env.NEXTAUTH_SECRET!,
        });
      } catch {
        // ignore decode errors → treat as unauthenticated
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userKey = token.sub ?? token.jti ?? 'anon';
    const rl = checkRateLimit(`api-auth:${userKey}:${pathname}`, 30, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rl.retryAfter },
        { status: 429 }
      );
    }

    return NextResponse.next();
  }

  // ── Page route protection ──
  const hostname = getRequestHostname(request.headers);

  // Same direct cookie decode for pages
  let token: any = null;
  const sessionCookie = request.cookies.get('next-auth.session-token')?.value;
  if (sessionCookie) {
    try {
      const { decode } = await import('next-auth/jwt');
      token = await decode({
        token: sessionCookie,
        secret: process.env.NEXTAUTH_SECRET!,
      });
    } catch {
      // ignore
    }
  }

  const isProtectedPath =
    pathname.startsWith('/generation') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/builder') ||
    (isPlatformAppHost(hostname) && pathname === '/');

  if (isProtectedPath && !token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set(
      'callbackUrl',
      pathname === '/' ? '/generation' : pathname
    );
    return NextResponse.redirect(signInUrl);
  }

  if (isPlatformAppHost(hostname) && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/generation';
    return NextResponse.rewrite(url);
  }

  if (isTenantSubdomainHost(hostname) || isCustomDomainHost(hostname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/site-host/${encodeTenantHost(hostname)}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
