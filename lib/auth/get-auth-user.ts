import { decode } from "next-auth/jwt";
import type { NextRequest } from "next/server";

/**
 * NextAuth v4 getServerSession() doesn't correctly parse cookies in Next.js 15 App Router.
 * This helper uses decode() directly, which works correctly.
 */
export async function getAuthUser(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const cookie = req.cookies.get("next-auth.session-token")?.value;

  if (!secret || !cookie) return null;

  try {
    const token = await decode({ token: cookie, secret });
    if (!token || !token.sub) return null;
    return {
      id: token.sub as string,
      email: token.email as string | undefined,
      name: token.name as string | undefined,
    };
  } catch {
    return null;
  }
}
