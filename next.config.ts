import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images from blob storage and elections.il.gov
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "elections.il.gov",
      },
    ],
  },

  // i18n handled via proxy.ts (Next.js 16 native proxy)
  // Do not use next.config i18n — path-based routing via [locale] segment
};

export default nextConfig;
