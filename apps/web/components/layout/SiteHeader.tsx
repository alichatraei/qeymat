"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown, Menu, Settings, User, X } from "lucide-react";
import { clock } from "@qeymat/shared";
import Brand from "./Brand";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { SessionUser } from "@/lib/types";

const NAV = [
  { href: "/", label: "بازار" },
  { href: "/chart", label: "نمودار و مقایسه" },
  { href: "/converter", label: "مبدل" },
  { href: "/plus", label: "قیمت پلاس", accent: true },
  { href: "/developers", label: "API" },
  { href: "/docs", label: "مستندات" },
];

export default function SiteHeader({
  user,
  hasPlus = false,
}: {
  user: SessionUser | null;
  hasPlus?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState("");

  useEffect(() => {
    const update = () => setNow(clock());
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // منو که باز است، صفحه پشتش نباید اسکرول شود
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const accountHref = user ? (user.role === "ADMIN" ? "/admin" : "/panel") : "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-line/90 bg-page/90 backdrop-blur-[18px]">
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
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link whitespace-nowrap"
              data-active={isActive(item.href)}
            >
              <span className="inline-flex items-center gap-1.5">
                {item.accent ? <Crown className="h-[14px] w-[14px] text-amber" /> : null}
                {item.label}
              </span>
            </Link>
          ))}
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
            <span className="hidden items-center gap-1.5 rounded-pill bg-amber-soft px-2.5 py-1.5 text-[10.5px] font-bold text-amber-ink sm:inline-flex">
              <Crown className="h-3.5 w-3.5" />
              پلاس
            </span>
          ) : null}

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

          <Link href={accountHref} className="btn-solid hidden h-10 min-h-0 sm:inline-flex">
            <User />
            <span className="whitespace-nowrap">{user ? "حساب من" : "ورود"}</span>
          </Link>

          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-line bg-surface text-sub xl:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "بستن منو" : "نمایش منو"}
            aria-expanded={open}
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-16 z-10 animate-fade-in bg-overlay/30 xl:hidden"
            onClick={() => setOpen(false)}
            aria-label="بستن منو"
            tabIndex={-1}
          />
          <nav
            className="relative z-20 max-h-[calc(100vh-4rem)] animate-fade-in overflow-y-auto border-t border-line bg-surface px-4 py-3 xl:hidden"
            aria-label="منوی موبایل"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-[10px] px-3 py-3 text-[13px] font-semibold ${
                  isActive(item.href) ? "bg-green-soft text-green-dark" : "text-sub"
                }`}
              >
                {item.accent ? <Crown className="h-4 w-4 text-amber" /> : null}
                {item.label}
              </Link>
            ))}

            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <Link href={accountHref} className="btn-solid flex-1">
                <User />
                {user ? "حساب من" : "ورود / ثبت‌نام"}
              </Link>
              {user?.role === "ADMIN" ? (
                <Link href="/admin" className="btn-ghost" aria-label="پنل مدیریت">
                  <Settings />
                </Link>
              ) : null}
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
