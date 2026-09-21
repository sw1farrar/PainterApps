import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/paintday/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
