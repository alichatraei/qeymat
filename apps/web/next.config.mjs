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
    // باینری Skia برای تصویر ربات تلگرام؛ باید همان‌طور که هست کنار سرور باشد
    "@napi-rs/canvas",
  ],

  // فونت‌های تصویر ربات با fs خوانده می‌شوند و tracer خودکار پیدایشان نمی‌کند
  outputFileTracingIncludes: {
    "/api/telegram/card": ["./assets/fonts/**/*", "../../node_modules/@napi-rs/**/*"],
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          // Service-Worker-Allowed لازم نیست (sw.js در ریشه است) و nginx هم می‌فرستدش؛
          // دوتایی شدنش («/, /») در Safari ثبت سرویس‌ورکر را با خطای scope رد می‌کرد
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
        // پروفایل فونت ویجت آیفون؛ سافاری فقط با این نوع محتوا پیشنهاد نصب می‌دهد
        source: "/widget/vazirmatn.mobileconfig",
        headers: [
          { key: "Content-Type", value: "application/x-apple-aspen-config" },
          { key: "Cache-Control", value: "public, max-age=86400" },
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
