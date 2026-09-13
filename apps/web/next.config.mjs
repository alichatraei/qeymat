/** @type {import('next').NextConfig} */
import path from "node:path";
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // ریشه‌ی مونوریپو تا tracer فایل‌های packages/* را هم پیدا کند
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),

  // فقط پکیج ESM مشترک ترنسپایل می‌شود
  transpilePackages: ["@qeymat/shared"],

  /**
   * این‌ها نباید باندل شوند: Prisma موتور خودش را با require پویا بار می‌کند
   * و bcryptjs/web-push/ioredis هم به فایل‌های جانبی وابسته‌اند. اگر باندل
   * شوند، در تصویر production هنگام اجرا می‌شکنند.
   */
  serverExternalPackages: [
    "@qeymat/db",
    "@prisma/client",
    "prisma",
    "bcryptjs",
    "web-push",
    "ioredis",
  ],

  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // API عمومی برای مشتریان API
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-API-Key,Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
