"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/types";

/**
 * نوار پایین شناور شیشه‌ای: بازار · تبدیل · هشدار · من.
 * «منتخب من» از نوار حذف شد و به‌عنوان اولین فیلتر در تب بازار می‌ماند.
 */
const TABS: { id: string; label: string; icon: React.ReactNode }[] = [
  {
    id: "market",
    label: "بازار",
    icon: (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4v16h18" /><path d="M7 15l4-4 3 3 6-7" />
      </svg>
    ),
  },
  {
    id: "convert",
    label: "تبدیل",
    icon: (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h14l-3-3M20 16H6l3 3" />
      </svg>
    ),
  },
  {
    id: "alerts",
    label: "هشدار",
    icon: (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
      </svg>
    ),
  },
  {
    id: "me",
    label: "من",
    icon: (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

export default function BottomNav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const account = user ? (user.role === "ADMIN" ? "/admin" : "/me") : "/login";
  const href = (id: string) =>
    id === "market" ? "/" : id === "convert" ? "/converter" : id === "alerts" ? "/alerts" : account;

  const activeId = (() => {
    if (pathname === "/") return "market";
    if (/^\/converter/.test(pathname)) return "convert";
    if (/^\/alerts/.test(pathname)) return "alerts";
    if (/^\/(me|panel|login|admin|plus|developers|docs|dashboard)/.test(pathname)) return "me";
    return "";
  })();

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="glass-nav fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 grid h-16 grid-cols-4 rounded-[22px] border border-[var(--glass-edge)] xl:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={href(tab.id)}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 text-[12px] no-underline transition-colors ${
              active ? "font-extrabold text-green-dark dark:text-brand-mint" : "font-medium text-sub"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
