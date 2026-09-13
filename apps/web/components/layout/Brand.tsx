import Link from "next/link";

/** نشان برند: علامت + نام فارسی + دامنه، همان ترکیب پروتوتایپ. */
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
      className="flex items-center gap-2.5 rounded-lg outline-offset-4"
      aria-label="قیمت — صفحه اصلی"
    >
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="brandMark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#12a873" />
            <stop offset="1" stopColor="#07734d" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#brandMark)" />
        <rect x="15" y="38" width="8" height="11" rx="4" fill="#fff" fillOpacity=".55" />
        <rect x="28" y="31" width="8" height="18" rx="4" fill="#fff" fillOpacity=".78" />
        <rect x="41" y="24" width="8" height="25" rx="4" fill="#fff" />
        <circle cx="45" cy="13" r="4.3" fill="#fff" />
        <circle cx="45" cy="13" r="8.2" fill="none" stroke="#fff" strokeOpacity=".41" strokeWidth="2.1" />
      </svg>
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
            tone === "light" ? "text-white/60" : "text-[#8a959c]"
          }`}
        >
          {sub}
        </span>
      </span>
    </Link>
  );
}
