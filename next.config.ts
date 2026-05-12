import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  experimental: {
    // @ts-ignore
    turbopack: {
      root: '.',
    },
  },
};

export default nextConfig;
