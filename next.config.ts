import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep production builds out of the dev cache (prevents ENOENT / missing chunk crashes).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  webpack: (config, { dev }) => {
    if (dev) {
      // OneDrive (and similar sync folders) break native file watchers and
      // constantly touch files under .next — polling without ignores causes a
      // non-stop recompile loop that makes the dev server feel hung in the browser.
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 600,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/.next-build/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;