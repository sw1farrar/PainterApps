import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep production builds out of the dev cache (prevents ENOENT / missing chunk crashes).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;