"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, X } from "lucide-react";
import type { AppLinks } from "@/lib/app-links";

const DISMISS_KEY = "qeymat:app-prompt-dismissed";
/** بعد از بستن، تا دو هفته دوباره نشان داده نمی‌شود */
const QUIET_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * پیشنهاد نصب اپ اندروید به کاربران اندروید سایت و PWA؛ PWA نمی‌تواند ویجت
 * صفحه‌ی اصلی داشته باشد ولی اپ اندروید دارد. فقط وقتی نمایش داده می‌شود
 * که مدیر لینک فروشگاه را در پنل وارد کرده باشد.
 */
export default function AppPrompt({ links }: { links: AppLinks }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!/android/i.test(window.navigator.userAgent)) return;
    try {
      const dismissed = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - dismissed < QUIET_MS) return;
    } catch {
      /* بدون حافظه‌ی مرورگر هم نمایش داده می‌شود */
    }
    // کمی بعد از باز شدن صفحه، تا با بارگذاری محتوا هم‌زمان نشود
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* بی‌اهمیت */
    }
  };

  if (!visible) return null;

  const stores = [
    links.bazaar ? { href: links.bazaar, label: "کافه‌بازار" } : null,
    links.myket ? { href: links.myket, label: "مایکت" } : null,
    !links.bazaar && !links.myket && links.direct ? { href: links.direct, label: "دانلود اپ" } : null,
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="fixed inset-x-3 bottom-[calc(86px+env(safe-area-inset-bottom))] z-50 animate-toast-in sm:inset-x-auto sm:left-5 sm:w-[380px] xl:bottom-5">
      <div className="card flex items-start gap-3 p-4 shadow-card">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block text-[13px]">ویجت دلار روی صفحه‌ی گوشی</strong>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            اپ اندروید «قیمت» ویجت قیمت لحظه‌ای و هشدار قیمت دارد.{" "}
            <Link href="/widget" className="font-semibold text-green-dark hover:underline" onClick={dismiss}>
              بیشتر
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stores.map((store) => (
              <a key={store.href} href={store.href} target="_blank" rel="noopener" onClick={dismiss} className="btn-solid h-9 min-h-0 !px-3 text-[11.5px]">
                {store.label}
              </a>
            ))}
          </div>
        </div>
        <button type="button" onClick={dismiss} className="grid h-8 w-8 place-items-center rounded-[10px] text-faint hover:bg-soft" aria-label="بستن">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
