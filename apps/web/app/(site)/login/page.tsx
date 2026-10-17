import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import OtpLogin from "@/components/layout/OtpLogin";
import { getSessionUser } from "@/lib/auth";
import { getSnapshot } from "@/lib/market";
import { fa } from "@qeymat/shared";

export const metadata: Metadata = { title: "ورود", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    const next = (await searchParams).next || "";
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/me";
    redirect(user.role === "ADMIN" ? "/admin" : safe);
  }

  const usd = await getSnapshot()
    .then((snapshot) => snapshot.assets.find((asset) => asset.symbol === "USD") ?? null)
    .catch(() => null);

  return (
    <div className="grid min-h-[calc(100vh-180px)] lg:grid-cols-2">
      {/* نیمهٔ برند: شعار، چرایی ورود و یک نرخ زنده — یعنی سایت کار می‌کند */}
      <aside className="relative hidden overflow-hidden bg-brand-deep text-brand-cream lg:flex lg:flex-col lg:justify-center lg:gap-6 lg:px-14">
        <svg className="pointer-events-none absolute -left-16 -top-16 h-[320px] w-[320px] opacity-[.07]" viewBox="12 12 37 38" aria-hidden="true">
          <path d="M45.86 37.90 A17.5 17.5 0 1 0 29.39 47.99 L29.65 40.49 A10 10 0 1 1 39.06 34.73 Z" fill="currentColor" />
          <path d="M28.39 47.88 L28.39 34.30 L29.39 33.70 L35.79 28.90 L35.79 47.01 A17.5 17.5 0 0 1 28.39 47.88 Z" fill="currentColor" />
        </svg>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/qeymat-mark.svg" alt="" width={44} height={44} />
          <strong className="text-[26px] font-extrabold">قیمت</strong>
        </div>
        <p className="text-[19px] font-bold">قیمت. همین.</p>
        <p className="max-w-[40ch] text-[13.5px] leading-7 text-brand-cream/80">
          با ورود، هشدار قیمت می‌سازید، منتخب‌تان بین دستگاه‌ها می‌ماند و قیمت پلاس فعال می‌شود.
        </p>
        {usd ? (
          <div className="flex items-center gap-3 rounded-[16px] border border-brand-cream/15 bg-brand-cream/[.04] px-4 py-3 text-[13px]">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-[2px] bg-brand-mint" aria-hidden="true" />
            دلار آمریکا
            <b className="tabular mr-auto text-[16px]">{fa(usd.sell)}</b>
            <span className="text-brand-cream/60">تومان</span>
          </div>
        ) : null}
      </aside>

      <Suspense fallback={<div className="min-h-[70vh]" />}>
        <OtpLogin />
      </Suspense>
    </div>
  );
}
