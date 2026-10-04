"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Braces, ChartLine, House, User } from "lucide-react";
import type { SessionUser } from "@/lib/types";

/**
 * ناوبری پایین صفحه برای موبایل و نسخه‌ی نصب‌شده (PWA)، به‌جای منوی همبرگری.
 * تمام‌عرض و چسبیده به پایین، مثل نوار زبانه‌ی اپ؛ ناحیه‌ی امن پایین گوشی
 * هم‌رنگ نوار است. از عرض xl که منوی بالا جا می‌شود، پنهان است.
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
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[22px] border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-8px_30px_rgba(7,19,31,.08)] backdrop-blur-xl xl:hidden dark:shadow-[0_-8px_30px_rgba(0,0,0,.35)]"
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5 pb-1.5">
        {items.map((item) => {
          const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[56px] flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors ${
                  active ? "text-green-dark dark:text-green" : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className={`grid h-[30px] w-[52px] place-items-center rounded-full transition-colors ${
                    active ? "bg-green-soft" : ""
                  }`}
                >
                  <item.icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.3 : 1.9} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
