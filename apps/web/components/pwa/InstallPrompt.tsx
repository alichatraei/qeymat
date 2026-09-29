"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "qeymat:install-dismissed";

/**
 * نوار نصب اپ. روی کروم/اج از رویداد beforeinstallprompt استفاده می‌کند و
 * روی سافاری iOS راهنمای دستی «افزودن به صفحه اصلی» را نشان می‌دهد.
 */
export default function InstallPrompt({ skipAndroid = false }: { skipAndroid?: boolean }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(DISMISS_KEY)) return;
    if (skipAndroid && /android/i.test(window.navigator.userAgent)) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error سافاری
      window.navigator.standalone === true;
    if (standalone) return;

    const onPrompt = (native: Event) => {
      native.preventDefault();
      setEvent(native as InstallEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /safari/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);
    if (isIos && isSafari) {
      setShowIos(true);
      setHidden(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [skipAndroid]);

  const dismiss = () => {
    setHidden(true);
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
    dismiss();
  };

  if (hidden) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(92px+env(safe-area-inset-bottom))] z-50 animate-toast-in sm:inset-x-auto sm:left-5 sm:w-[360px] xl:bottom-5">
      <div className="card flex items-start gap-3 p-4 shadow-card">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
          {showIos ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block text-[13px]">قیمت را روی گوشی نصب کنید</strong>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            {showIos
              ? "دکمه‌ی هم‌رسانی سافاری را بزنید و «افزودن به صفحه اصلی» را انتخاب کنید."
              : "دسترسی سریع به نرخ‌ها، اجرای آفلاین و دریافت اعلان قیمت."}
          </p>
          {!showIos ? (
            <button type="button" className="btn-solid mt-3 h-9 min-h-0 px-3 text-[11.5px]" onClick={install}>
              نصب اپ
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="بستن"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-soft"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
