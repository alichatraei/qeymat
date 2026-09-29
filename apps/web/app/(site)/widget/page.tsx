import type { Metadata } from "next";
import { Apple, Smartphone } from "lucide-react";
import { fa } from "@qeymat/shared";
import CopyScript from "@/components/widget/CopyScript";
import { getSnapshot } from "@/lib/market";
import { getAppLinks, hasAppLinks } from "@/lib/app-links";
import { SCRIPTABLE_WIDGET, WIDGET_VERSION } from "@/lib/scriptable-widget";
import type { RateView } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ویجت قیمت برای گوشی",
  description: "قیمت لحظه‌ای دلار، طلا، سکه و رمزارز روی صفحه‌ی اصلی و صفحه‌ی قفل آیفون و اندروید.",
  alternates: { canonical: "/widget" },
};

const SCRIPTABLE_URL = "https://apps.apple.com/app/scriptable/id1405459188";
/** نمادهای پیشنهادی برای پارامتر ویجت */
const SUGGESTED = ["USD", "EUR", "AED", "TRY", "GOLD18", "EMAMI", "HALF", "ABSHODEH", "USDT", "BTC", "ETH", "BRENT"];

/** همان قالب قیمت سایت؛ formatPrice در کامپوننت کلاینت است و این صفحه سروری است */
function priceText(value: number) {
  if (Math.abs(value) >= 1000) return fa(Math.round(value));
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
}

export default async function WidgetPage() {
  const [snapshot, links] = await Promise.all([getSnapshot(), getAppLinks()]);
  const bySymbol = new Map(snapshot.assets.map((asset) => [asset.symbol, asset]));
  const preview = ["USD", "GOLD18", "USDT"].map((symbol) => bySymbol.get(symbol)).filter(Boolean) as RateView[];
  const suggested = SUGGESTED.map((symbol) => bySymbol.get(symbol)).filter(Boolean) as RateView[];

  return (
    <main className="content-width max-w-[860px] pb-20 pt-10">
      <h1 className="text-[28px] font-extrabold tracking-[-1px] sm:text-[32px]">ویجت قیمت روی صفحه‌ی گوشی</h1>
      <p className="mt-3 max-w-[56ch] text-[13px] leading-7 text-muted">
        دلار، طلا، سکه یا هر دارایی دیگر را بدون باز کردن سایت، روی صفحه‌ی اصلی یا صفحه‌ی قفل گوشی ببینید.
      </p>

      {/* ---------------------------- اندروید ---------------------------- */}
      <section className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 text-[17px] font-bold">
          <Smartphone className="h-5 w-5 text-green" />
          اندروید
        </h2>
        <p className="mt-2 text-[12.5px] leading-7 text-sub">
          اپ اندروید «قیمت» دو ویجت دارد: «قیمت دلار» با نمودار هفتگی و «قیمت‌های منتخب». بعد از نصب، روی صفحه‌ی
          اصلی انگشت را نگه دارید، «ویجت‌ها» را بزنید و «قیمت» را انتخاب کنید.
        </p>
        {hasAppLinks(links) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.bazaar ? (
              <a href={links.bazaar} target="_blank" rel="noopener" className="btn-solid h-11">
                دریافت از کافه‌بازار
              </a>
            ) : null}
            {links.myket ? (
              <a href={links.myket} target="_blank" rel="noopener" className="btn-solid h-11">
                دریافت از مایکت
              </a>
            ) : null}
            {links.direct ? (
              <a href={links.direct} className="btn-ghost h-11">
                دانلود مستقیم
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-3 text-[12px] text-muted">
            اپ اندروید به‌زودی در کافه‌بازار و مایکت منتشر می‌شود.
          </p>
        )}
      </section>

      {/* ------------------------------ آیفون ------------------------------ */}
      <section className="card mt-5 p-6">
        <h2 className="flex items-center gap-2 text-[17px] font-bold">
          <Apple className="h-5 w-5 text-green" />
          آیفون
        </h2>
        <p className="mt-2 text-[12.5px] leading-7 text-sub">
          آیفون به سایت‌ها اجازه‌ی ساخت ویجت نمی‌دهد. اپ رایگان <b>Scriptable</b> این کار را با یک اسکریپت کوچک
          ممکن می‌کند؛ اسکریپت «قیمت» را یک بار در آن بچسبانید و ویجت همیشه به‌روز می‌ماند.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
          <ol className="space-y-4 text-[12.5px] leading-7 text-sub [&>li]:relative [&>li]:pr-9">
            <Step n={1}>
              اپ{" "}
              <a href={SCRIPTABLE_URL} target="_blank" rel="noopener" className="font-semibold text-green-dark underline">
                Scriptable
              </a>{" "}
              را از اپ‌استور نصب کنید.
            </Step>
            <Step n={2}>
              اسکریپت را کپی کنید:
              <div className="mt-2">
                <CopyScript script={SCRIPTABLE_WIDGET} />
              </div>
            </Step>
            <Step n={3}>
              Scriptable را باز کنید، دکمه‌ی <b>+</b> را بزنید و متن را بچسبانید. بالای صفحه روی «Untitled Script»
              بزنید و نامش را <b>قیمت</b> بگذارید.
            </Step>
            <Step n={4}>
              روی صفحه‌ی اصلی انگشت را نگه دارید، <b>+</b> گوشه‌ی بالا را بزنید، Scriptable را انتخاب کنید و اندازه‌ی
              کوچک (یک دارایی)، متوسط (سه دارایی) یا بزرگ (هشت دارایی) را اضافه کنید.
            </Step>
            <Step n={5}>
              روی ویجت انگشت را نگه دارید و «Edit Widget» را بزنید. در <b>Script</b> «قیمت» را انتخاب کنید و در{" "}
              <b>Parameter</b> نماد دارایی‌ها را با کاما بنویسید، مثلاً <code dir="ltr">USD,GOLD18,EMAMI</code>. اگر
              خالی بماند، دلار، یورو، طلا، سکه، تتر و بیت‌کوین نمایش داده می‌شود.
            </Step>
            <Step n={6}>
              برای <b>صفحه‌ی قفل</b> (iOS ۱۶ به بعد): روی صفحه‌ی قفل انگشت را نگه دارید، «Customize» و بعد صفحه‌ی قفل
              را بزنید و ویجت Scriptable را با همین تنظیمات اضافه کنید.
            </Step>
          </ol>

          {/* پیش‌نمایش ویجت متوسط با نرخ‌های واقعی همین لحظه */}
          <div className="self-start">
            <div className="rounded-[26px] bg-gradient-to-b from-[#11443a] to-[#06120d] p-4 text-white shadow-card">
              <div className="flex items-center justify-between text-[10px] text-white/40">
                <b className="text-[13px] font-extrabold text-[#8fd8b8]">قیمت</b>
                <span>پیش‌نمایش</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {preview.map((rate) => (
                  <div key={rate.symbol} className="flex items-center gap-2 text-[12.5px]">
                    <span className="flex-1 text-white/60">{rate.nameFa}</span>
                    <b className="tabular text-[14px]">{priceText(rate.sell)}</b>
                    <span className={`text-[10px] font-bold ${rate.changePercent >= 0 ? "text-[#4fd6a4]" : "text-[#ff8a80]"}`}>
                      {rate.changePercent >= 0 ? "▲" : "▼"} {fa(Math.abs(Math.round(rate.changePercent * 100) / 100))}٪
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-center text-[10.5px] text-muted">نسخه‌ی اسکریپت {fa(WIDGET_VERSION)}</p>
          </div>
        </div>

        {suggested.length ? (
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-[12.5px] font-bold">نمادهای پرکاربرد برای Parameter</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggested.map((rate) => (
                <span key={rate.symbol} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-field px-3 py-1.5 text-[11px]">
                  <code dir="ltr" className="font-bold text-ink">
                    {rate.symbol}
                  </code>
                  <span className="text-muted">{rate.nameFa}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li>
      <span className="absolute right-0 top-0.5 grid h-6 w-6 place-items-center rounded-full bg-green-soft text-[11px] font-bold text-green-dark">
        {fa(n)}
      </span>
      {children}
    </li>
  );
}
