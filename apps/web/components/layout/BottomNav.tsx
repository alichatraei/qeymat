"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/types";

/**
 * پنج تب فاز ۲: بازار · نمودار · تبدیل · هشدار · من، با آیکن‌های اختصاصی
 * «قیمت». تب فعال stroke ضخیم‌تر و نقطهٔ نعنایی دارد (امضای برند).
 * مسیر آیکن‌ها همان مجموعهٔ دیزاین است و نقطه در دهانهٔ هر آیکن می‌نشیند.
 */
const TABS: { id: string; label: string; d: string; dot: [number, number]; match: RegExp }[] = [
  { id: "market", label: "بازار", d: "M5 20h14M7.5 16.5v-5M12 16.5v-9M16.5 16.5V11", dot: [15, 4.6], match: /^\/$/ },
  { id: "chart", label: "نمودار", d: "M3.5 3.5v17h17M7 15.5l3.5-4 3 3 4.5-5.5", dot: [17.2, 4.4], match: /^\/chart/ },
  {
    id: "convert",
    label: "تبدیل",
    d: "M18.5 9.6A7 7 0 0 0 5.7 7.6M5.2 4.2v3.6h3.6M5.5 14.4A7 7 0 0 0 18.3 16.4M18.8 19.8v-3.6h-3.6",
    dot: [10.5, 10.5],
    match: /^\/converter/,
  },
  {
    id: "alerts",
    label: "هشدار",
    d: "M6.5 10a5.5 5.5 0 0 1 11 0c0 5.5 2.5 7.5 2.5 7.5H4s2.5-2 2.5-7.5M10.2 20.5a2 2 0 0 0 3.6 0",
    dot: [17.5, 1.8],
    match: /^\/alerts$/,
  },
  {
    id: "me",
    label: "من",
    d: "M12 4.2a3.8 3.8 0 1 0 0 7.6a3.8 3.8 0 1 0 0-7.6M4.5 20.5a7.5 7.5 0 0 1 15 0",
    dot: [17.8, 2.6],
    match: /^\/(me|panel|login|admin|plus|developers|docs|dashboard)/,
  },
];

export default function BottomNav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const account = user ? (user.role === "ADMIN" ? "/admin" : "/me") : "/login";
  const href = (id: string) =>
    id === "market" ? "/" : id === "chart" ? "/chart" : id === "convert" ? "/converter" : id === "alerts" ? "/alerts" : account;

  const activeId = (() => {
    if (pathname === "/") return "market";
    if (/^\/chart/.test(pathname)) return "chart";
    if (/^\/converter/.test(pathname)) return "convert";
    if (/^\/alerts/.test(pathname)) return "alerts";
    if (/^\/(panel|me|login|admin|plus|developers|docs|dashboard)/.test(pathname)) return "me";
    return "";
  })();

  return (
    <nav
      aria-label="بخش‌های اصلی"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl xl:hidden"
    >
      <ul className="mx-auto flex max-w-[560px]">
        {TABS.map((tab) => {
          const active = tab.id === activeId;
          return (
            <li key={tab.id} className="min-w-0 flex-1">
              <Link
                href={href(tab.id)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-[3px] text-[12px] transition-colors ${
                  active ? "font-bold text-ink" : "font-medium text-sub"
                }`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2 : 1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="overflow-visible"
                >
                  <path d={tab.d} />
                  {active ? (
                    <rect x={tab.dot[0]} y={tab.dot[1]} width="3" height="3" rx="0.65" fill="rgb(var(--c-icon-dot))" stroke="none" />
                  ) : null}
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
