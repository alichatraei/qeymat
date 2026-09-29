"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Braces, ChartLine, House, User } from "lucide-react";
import type { SessionUser } from "@/lib/types";

/**
 * ناوبری پایین صفحه برای موبایل و نسخه‌ی نصب‌شده (PWA)، به‌جای منوی همبرگری.
 * شیشه‌ای و شناور بالای ناحیه‌ی امن پایین گوشی؛ از عرض xl که منوی بالا
 * جا می‌شود، پنهان است.
 */
export default function BottomNav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const account = user ? (user.role === "ADMIN" ? "/admin" : "/panel") : "/login";

  const items = [
    { href: "/", label: "خانه", icon: House, match: (path: string) => path === "/" },
    { href: "/chart", label: "نمودار", icon: ChartLine },
    { href: "/converter", label: "تبدیل ارز", icon: ArrowLeftRight },
    { href: "/developers", label: "API", icon: Braces, match: (path: string) => /^\/(developers|docs|dashboard)/.test(path) },
    {
      href: account,
      label: user ? "حساب من" : "ورود",
      icon: User,
      match: (path: string) => /^\/(panel|login|admin|plus)/.test(path),
    },
  ];

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[520px] rounded-[24px] border border-white/60 bg-surface/65 p-1.5 shadow-[0_12px_40px_rgba(7,19,31,.18)] backdrop-blur-2xl backdrop-saturate-150 xl:hidden dark:border-white/10 dark:bg-surface/55 dark:shadow-[0_12px_40px_rgba(0,0,0,.5)]"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[54px] flex-col items-center justify-center gap-1 rounded-[18px] text-[10.5px] font-semibold transition-colors ${
                  active ? "bg-green-soft/90 text-green-dark" : "text-muted hover:text-ink"
                }`}
              >
                <item.icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.3 : 1.9} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
