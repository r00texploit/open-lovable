import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    proxyClientMaxBodySize: "25mb",
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },

  // Image optimization for faster loading
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Headers for performance
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/fonts/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Prevent server-only SDKs from being bundled in client-side code
  serverExternalPackages: [
    "@vercel/sandbox",
    "@e2b/code-interpreter",
    "stripe",
  ],
};

export default nextConfig;
