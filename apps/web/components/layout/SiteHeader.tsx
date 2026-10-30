"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown, Settings, User } from "lucide-react";
import { clock } from "@qeymat/shared";
import Brand from "./Brand";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { SessionUser } from "@/lib/types";

/* فاز ۲: چهار لینک اصلی. API و مستندات به فوتر رفتند و Plus در ناحیهٔ انتهایی است */
const NAV = [
  { href: "/", label: "بازار" },
  { href: "/chart", label: "نمودار" },
  { href: "/converter", label: "تبدیل ارز" },
  { href: "/alerts", label: "هشدار قیمت" },
];

export default function SiteHeader({
  user,
  hasPlus = false,
}: {
  user: SessionUser | null;
  hasPlus?: boolean;
}) {
  const pathname = usePathname();
  const [now, setNow] = useState("");

  useEffect(() => {
    const update = () => setNow(clock());
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const accountHref = user ? (user.role === "ADMIN" ? "/admin" : "/me") : "/login";

  return (
    <header className="glass-nav sticky top-0 z-40 border-b border-[var(--glass-edge)]">
      {/*
        چیدمان سه‌ستونی با grid به‌جای flex:
        ستون میانی منو را دقیقاً وسط نگه می‌دارد و ستون‌های کناری اجازه‌ی
        کوچک‌شدن دارند، پس در عرض‌های میانی محتوا بیرون نمی‌زند.
      */}
      <div className="mx-auto grid h-16 w-[min(1240px,calc(100%-32px))] grid-cols-[auto_1fr_auto] items-center gap-3 md:h-[72px] md:w-[min(1240px,calc(100%-48px))]">
        <Brand />

        <nav
          className="hidden min-w-0 items-center justify-center gap-0.5 xl:flex"
          aria-label="منوی اصلی"
        >
          {NAV.map((item) => {
            const active = isActive(item.href.split("#")[0]);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex h-10 items-center whitespace-nowrap rounded-[10px] px-3.5 text-[14px] no-underline transition-colors ${
                  active
                    ? "font-bold text-ink after:absolute after:inset-x-3.5 after:-bottom-[15px] after:h-0.5 after:rounded-full after:bg-green-dot after:content-['']"
                    : "font-medium text-sub hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2">
          {/* ساعت فقط جایی که واقعاً جا هست */}
          <div className="hidden items-center gap-2 border-l border-line pl-3 2xl:flex">
            <span className="h-2 w-2 shrink-0 animate-pulse-dot rounded-full bg-green-dot" />
            <span className="flex flex-col leading-tight">
              <strong className="whitespace-nowrap text-[10.5px] font-semibold text-sub">
                بازار زنده
              </strong>
              <small className="text-2xs text-faint">{now || "—"}</small>
            </span>
          </div>

          {hasPlus ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-soft px-2.5 py-1.5 text-[10.5px] font-bold text-amber-ink">
              <Crown className="h-3.5 w-3.5" />
              پلاس
            </span>
          ) : (
            // نشان «قیمت پلاس» با حلقهٔ باز Q و علامت + (آیکن برند فاز ۲)
            <Link
              href="/plus"
              className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-[rgba(233,185,73,.16)] px-3 text-[12.5px] font-bold text-amber-ink no-underline transition-colors hover:text-amber"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18.93 16A8 8 0 1 0 16 18.93M12 8.5v7M8.5 12h7" />
              </svg>
              قیمت پلاس
            </Link>
          )}

          {user?.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="btn-ghost hidden h-10 min-h-0 !px-3 lg:inline-flex"
              aria-label="پنل مدیریت"
            >
              <Settings />
            </Link>
          ) : null}

          <ThemeToggle />

          <Link
            href={accountHref}
            className="hidden h-10 items-center gap-2 rounded-xl bg-green-dot px-4 text-[13px] font-extrabold text-brand-deep no-underline transition-transform active:scale-[.97] xl:inline-flex"
          >
            <User className="h-[18px] w-[18px]" />
            <span className="whitespace-nowrap">{user ? "حساب من" : "ورود"}</span>
          </Link>

        </div>
      </div>

    </header>
  );
}
