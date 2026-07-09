import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

/**
 * Result of a successful admin auth check — the session and the full user row
 * (so routes can read role/subscription/etc without a second query).
 */
export type AdminAuth = {
  session: Awaited<ReturnType<typeof getServerSession>>;
  user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
};

/**
 * Server-side guard for admin-only routes/handlers. Returns the session + user
 * when the caller is an admin, or `null` when unauthenticated or non-admin.
 *
 * Mirrors the `requireUser` pattern in lib/auth/server.ts but additionally
 * verifies the user's role is `admin` against the database (not just the JWT)
 * so a revoked admin cannot pass with a stale token.
 */
export async function requireAdmin(): Promise<AdminAuth | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.role !== 'admin') {
    return null;
  }

  return { session, user };
}

/**
 * Convenience for API route handlers: returns a 403 NextResponse when the
 * caller is not an admin, otherwise returns the admin auth context.
 *
 * Usage:
 *   const auth = await requireAdminOr403();
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireAdminOr403(): Promise<AdminAuth | NextResponse> {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }
  return auth;
}

/**
 * Client/component helper to read admin status from a NextAuth session object.
 */
export function isAdminSession(
  session: { user?: { role?: 'user' | 'admin' } | null } | null,
): boolean {
  return session?.user?.role === 'admin';
}