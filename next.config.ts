import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Image Optimization ──────────────────────────────────────
  images: {
    remotePatterns: [
      {
        // DevRev API artifact URLs
        protocol: "https",
        hostname: "*.devrev-eng.ai",
      },
      {
        // S3 artifact content
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        // Customer logo URLs (various CDNs)
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // ─── Headers ─────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Cache article content pages at CDN level (ISR handles revalidation)
        source: "/:locale/:slug/articles/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Cache directory pages
        source: "/:locale/:slug/directories/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=3600",
          },
        ],
      },
      {
        // Don't cache user-specific pages
        source: "/:locale/:slug/tickets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache",
          },
        ],
      },
    ];
  },

  // ─── Rewrites (for artifact content proxying) ────────────────
  async rewrites() {
    return [
      {
        // Proxy artifact downloads to avoid CORS issues
        source: "/api/artifact-proxy/:path*",
        destination: `${process.env.DEVREV_API_BASE || "https://api.dev.devrev-eng.ai"}/internal/artifacts.locate`,
      },
    ];
  },

  // ─── Experimental ────────────────────────────────────────────
  experimental: {
    // Enable PPR for hybrid static/dynamic pages
    // ppr: true,
  },
};

export default nextConfig;
