import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        // Get user subscription
        const subscription = await prisma.subscription.findUnique({
          where: { userId: user.id },
        });

        // Get user usage
        const usage = await prisma.usage.findUnique({
          where: { userId: user.id },
        });

        session.user.subscription = subscription;
        session.user.usage = usage;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
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