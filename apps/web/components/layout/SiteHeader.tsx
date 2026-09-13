"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Settings, User, X } from "lucide-react";
import { clock } from "@qeymat/shared";
import Brand from "./Brand";
import type { SessionUser } from "@/lib/types";

const NAV = [
  { href: "/", label: "بازار" },
  { href: "/converter", label: "مبدل" },
  { href: "/developers", label: "API قیمت" },
  { href: "/ai", label: "هوش مصنوعی" },
  { href: "/docs", label: "مستندات" },
];

export default function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState("");

  // ساعت فقط سمت کلاینت ساخته می‌شود تا با HTML سرور اختلاف نداشته باشد
  useEffect(() => {
    const update = () => setNow(clock());
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(220,228,224,.9)] bg-[rgba(250,252,251,.96)] backdrop-blur-[18px]">
      <div className="mx-auto flex h-[76px] w-[min(1240px,calc(100%-48px))] items-center gap-4">
        <Brand />

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="منوی اصلی">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link" data-active={isActive(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mr-auto flex items-center gap-2.5 lg:mr-0">
          <div className="hidden items-center gap-[7px] border-l border-line pl-3 md:flex">
            <span className="h-2 w-2 rounded-full bg-green-dot shadow-[0_0_0_4px_rgba(23,185,121,.11)]" />
            <span className="flex flex-col leading-tight">
              <strong className="text-[10.5px] font-semibold text-[#44515a]">بازار زنده</strong>
              <small className="text-2xs text-[#929ba1]">{now || "—"}</small>
            </span>
          </div>

          {user?.role === "ADMIN" ? (
            <Link href="/admin" className="btn-ghost hidden md:inline-flex">
              <Settings />
              مدیریت
            </Link>
          ) : null}

          <Link href={user ? "/dashboard" : "/login"} className="btn-solid hidden sm:inline-flex">
            <User />
            {user ? "حساب من" : "ورود"}
          </Link>

          <button
            type="button"
            className="grid h-[42px] w-[42px] place-items-center rounded-control border border-line bg-white lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "بستن منو" : "نمایش منو"}
            aria-expanded={open}
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="animate-fade-in border-t border-line bg-white px-6 py-3 lg:hidden" aria-label="منوی موبایل">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-[10px] px-3 py-3 text-[13px] font-semibold ${
                isActive(item.href) ? "bg-green-soft text-green-dark" : "text-[#505b64]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-line pt-3">
            <Link href={user ? "/dashboard" : "/login"} className="btn-solid flex-1">
              {user ? "حساب من" : "ورود / ثبت‌نام"}
            </Link>
            {user?.role === "ADMIN" ? (
              <Link href="/admin" className="btn-ghost">
                <Settings />
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
