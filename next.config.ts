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
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PRICE_PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    NEXT_PUBLIC_STRIPE_PRICE_TEAM: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM,
  },
};

export default nextConfig;
