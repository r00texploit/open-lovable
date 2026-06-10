import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { signInSchema } from '@/lib/validations/auth';
import { ensureFreeEntitlements, getNormalizedSubscriptionState } from '@/lib/usage/token-usage';

export const authOptions: NextAuthOptions = {
  // Required in production — without it every /api/auth/* route 500s with NO_SECRET
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        console.log('[Google Provider] Profile received:', profile.email);
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Validate credentials format
        const result = signInSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });

        if (!result.success) {
          return null;
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Check if user exists and has a password (not OAuth only)
        if (!user || !user.password) {
          return null;
        }

        // Verify password
        const isValid = await verifyPassword(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        // Return user without password
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id) {
        const { subscription, usage } = await getNormalizedSubscriptionState(token.id as string);
        token.subscription = {
          tier: subscription.tier,
          status: subscription.status,
        };
        token.usage = {
          generationsUsed: usage.generationsUsed,
          generationsLimit: usage.generationsLimit,
          resetDate: usage.resetDate.toISOString(),
        };
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.subscription = token.subscription || null;
        session.user.usage = token.usage
          ? {
              generationsUsed: token.usage.generationsUsed,
              generationsLimit: token.usage.generationsLimit,
              resetDate: new Date(token.usage.resetDate),
            }
          : null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('[Auth Redirect] Called with url:', url, 'baseUrl:', baseUrl);

      // Handle callback URLs with paths like /generation or /pricing
      if (url.startsWith('/')) {
        const result = `${baseUrl}${url}`;
        console.log('[Auth Redirect] URL starts with /, returning:', result);
        return result;
      }

      // Handle full URLs
      try {
        const target = new URL(url);
        console.log('[Auth Redirect] Parsed URL:', target.href, 'pathname:', target.pathname, 'origin:', target.origin);
        if (target.origin === baseUrl) {
          // If it's a callback to the base URL, redirect to /generation
          if (target.pathname === '/' || target.pathname === '') {
            const result = `${baseUrl}/generation`;
            console.log('[Auth Redirect] Path is root, returning:', result);
            return result;
          }
          // Otherwise preserve the path
          console.log('[Auth Redirect] Same origin, preserving path:', url);
          return url;
        }
      } catch (e) {
        console.log('[Auth Redirect] Error parsing URL:', e);
        // Invalid URL, default to /generation
        return `${baseUrl}/generation`;
      }

      // Default fallback
      console.log('[Auth Redirect] Default fallback to /generation');
      return `${baseUrl}/generation`;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
    newUser: '/generation',
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log('[Auth Events] signIn called:', { userId: user.id, provider: account?.provider, isNewUser });
      if (user.id) {
        await ensureFreeEntitlements(user.id);
        console.log('[Auth Events] Free entitlements ensured for user:', user.id);
      }
    },
  },
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      subscription?: {
        tier: string;
        status: string;
      } | null;
      usage?: {
        generationsUsed: number;
        generationsLimit: number;
        resetDate: Date;
      } | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    subscription?: {
      tier: string;
      status: string;
    } | null;
    usage?: {
      generationsUsed: number;
      generationsLimit: number;
      resetDate: string;
    } | null;
  }
}
