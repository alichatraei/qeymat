"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown, Settings, User } from "lucide-react";
import { clock } from "@qeymat/shared";
import Brand from "./Brand";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { SessionUser } from "@/lib/types";

const NAV = [
  { href: "/", label: "بازار" },
  { href: "/chart", label: "نمودار و مقایسه" },
  { href: "/converter", label: "تبدیل ارزها" },
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
  const [now, setNow] = useState("");

  useEffect(() => {
    const update = () => setNow(clock());
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

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
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-soft px-2.5 py-1.5 text-[10.5px] font-bold text-amber-ink">
              <Crown className="h-3.5 w-3.5" />
              پلاس
            </span>
          ) : (
            // در موبایل «قیمت پلاس» در ناوبری پایین نیست؛ از همین‌جا در دسترس است
            <Link
              href="/plus"
              className="inline-flex h-10 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[11.5px] font-bold text-amber-ink xl:hidden"
            >
              <Crown className="h-4 w-4 text-amber" />
              پلاس
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

          <Link href={accountHref} className="btn-solid hidden h-10 min-h-0 xl:inline-flex">
            <User />
            <span className="whitespace-nowrap">{user ? "حساب من" : "ورود"}</span>
          </Link>

        </div>
      </div>

    </header>
  );
}
