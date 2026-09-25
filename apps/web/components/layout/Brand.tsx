import Link from "next/link";

/** هندسه‌ی نشان Q — همان که scripts/generate-icons.mjs آیکون‌ها را از آن می‌سازد */
const RING = "M45.86 37.90 A17.5 17.5 0 1 0 29.39 47.99 L29.65 40.49 A10 10 0 1 1 39.06 34.73 Z";
const STEM = "M28.39 47.88 L28.39 34.30 L29.39 33.70 L35.79 28.90 L35.79 47.01 A17.5 17.5 0 0 1 28.39 47.88 Z";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id="brandBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#11443a" />
          <stop offset="1" stopColor="#072019" />
        </linearGradient>
        <radialGradient id="brandGlow" cx=".78" cy=".14" r=".75">
          <stop offset="0" stopColor="#8fd8b8" stopOpacity=".28" />
          <stop offset="1" stopColor="#8fd8b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="brandCream" gradientUnits="userSpaceOnUse" x1="0" y1="12" x2="0" y2="49">
          <stop offset="0" stopColor="#fbf8f0" />
          <stop offset="1" stopColor="#e9e3d3" />
        </linearGradient>
        <linearGradient id="brandMint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#aef0cf" />
          <stop offset="1" stopColor="#6fc9a0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#brandBg)" />
      <rect width="64" height="64" rx="15" fill="url(#brandGlow)" />
      <path d={RING} fill="url(#brandCream)" />
      <path d={STEM} fill="url(#brandCream)" />
      <rect x="41.2" y="43.2" width="6.2" height="6.2" rx="1.3" fill="url(#brandMint)" />
    </svg>
  );
}

/** نشان برند: علامت Q + نام فارسی + دامنه */
export default function Brand({
  href = "/",
  sub = "qeymat.online",
  tone = "dark",
}: {
  href?: string;
  sub?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-lg outline-offset-4"
      aria-label="قیمت — صفحه اصلی"
    >
      <BrandMark className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span
          className={`text-[25px] font-extrabold tracking-[-1.2px] ${
            tone === "light" ? "text-white" : "text-ink"
          }`}
        >
          قیمت
        </span>
        <span
          dir="ltr"
          className={`mt-1 font-mono text-[9.5px] font-medium ${
            tone === "light" ? "text-white/60" : "text-faint"
          }`}
        >
          {sub}
        </span>
      </span>
    </Link>
  );
}
