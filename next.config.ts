import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Prevent server-only SDKs from being bundled in client-side code
  serverExternalPackages: [
    '@vercel/sandbox',
    '@e2b/code-interpreter',
    'stripe',
  ],
};

export default nextConfig;
