"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  Code2,
  ExternalLink,
  Gift,
  Globe,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { fa } from "@qeymat/shared";

type Item = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  period: string;
  badge: string | null;
  features: string[];
  priceUsd: number;
  priceToman: number;
};

const TRUST = [
  { icon: ShieldCheck, title: "پرداخت با ریال", note: "بدون نیاز به کارت بین‌المللی" },
  { icon: Check, title: "تحویل همان روز", note: "اکثر سفارش‌ها زیر ۲ ساعت" },
  { icon: ShieldCheck, title: "کارمزد شفاف", note: "نرخ روز دلار، بدون هزینه پنهان" },
];

/**
 * آیکون‌های مجاز برای محصولات.
 * نگاشت صریح است تا کل کتابخانه lucide وارد باندل نشود؛
 * نام آیکون از دیتابیس می‌آید و اگر ناشناخته بود، پیش‌فرض استفاده می‌شود.
 */
const PRODUCT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Bot,
  Code2,
  Wallet,
  Globe,
  Gift,
  ShieldCheck,
};

function ProductIcon({ name, className }: { name: string; className?: string }) {
  const Component = PRODUCT_ICONS[name] ?? Sparkles;
  return <Component className={className} />;
}

export default function AiStore({
  items,
  usdRate,
  usdLabel,
  asapayUrl,
}: {
  items: Item[];
  usdRate: number;
  usdLabel: string;
  asapayUrl: string;
}) {
  const [active, setActive] = useState<Item | null>(null);

  return (
    <main className="pb-20 pt-12">
      <section className="content-width grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.7fr)] lg:items-center">
        <div className="max-w-[54ch]">
          <span className="text-[11.5px] font-bold text-green-dark">با همکاری آساپی</span>
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.25] tracking-[-1.2px]">
            اکانت هوش مصنوعی و پرداخت ارزی، با ریال
          </h1>
          <p className="mt-4 text-[13px] leading-7 text-muted">
            اشتراک ChatGPT، Claude و Cursor، شارژ اعتبار API و پرداخت هر صورتحساب بین‌المللی. قیمت‌ها
            بر اساس نرخ دلار همین صفحه محاسبه می‌شود، پس دقیقاً می‌دانید بابت چه چیزی پرداخت می‌کنید.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={asapayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              <ExternalLink />
              مشاهده در آساپی
            </a>
            {usdRate ? (
              <span className="text-[11.5px] text-muted">
                نرخ مبنای امروز: <b className="tabular text-ink">{usdLabel}</b> تومان
              </span>
            ) : null}
          </div>
        </div>

        <div className="card grid gap-4 p-6 shadow-card">
          {TRUST.map((trust) => (
            <div key={trust.title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
                <trust.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex flex-col">
                <b className="text-[12.5px]">{trust.title}</b>
                <small className="text-[11px] text-muted">{trust.note}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-width pt-14">
        <h2 className="text-[24px] font-bold tracking-[-.5px]">سرویس‌های موجود</h2>
        <p className="mt-1.5 text-[12px] text-muted">
          برای ثبت سفارش روی هر کارت بزنید؛ کارشناس آساپی مراحل پرداخت را پیگیری می‌کند.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              id={item.slug}
              className="card flex flex-col p-6 transition-colors hover:border-[#cbd6d1]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
                  <ProductIcon name={item.icon} className="h-5 w-5" />
                </span>
                {item.badge ? (
                  <span className="chip bg-[#fdf3e2] text-[#a8741a]">{item.badge}</span>
                ) : null}
              </div>

              <h3 className="mt-4 text-[17px] font-bold">{item.title}</h3>
              <p className="mt-1 text-[11.5px] text-muted">{item.subtitle}</p>
              <p className="mt-3 text-[12px] leading-6 text-[#4c5760]">{item.description}</p>

              <ul className="mt-4 space-y-2 text-[11.5px] text-[#4c5760]">
                {item.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-green" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto border-t border-line pt-4">
                {item.priceToman ? (
                  <div className="flex items-baseline gap-1.5">
                    <strong className="tabular text-[22px] font-extrabold tracking-[-.8px]">
                      {fa(item.priceToman)}
                    </strong>
                    <span className="text-[11px] text-muted">تومان / {item.period}</span>
                  </div>
                ) : (
                  <div className="text-[13px] font-bold text-ink">استعلام بر اساس صورتحساب</div>
                )}
                <button type="button" className="btn-solid mt-3 w-full" onClick={() => setActive(item)}>
                  ثبت سفارش
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] leading-6 text-muted">
          سفارش‌ها توسط آساپی پردازش می‌شوند. برای سرویس‌هایی که روی حساب شخصی شما فعال می‌شوند،
          دسترسی حساب لازم است و کارشناس در همان مرحله راهنمایی می‌کند.
        </p>
      </section>

      {active ? <OrderDialog item={active} onClose={() => setActive(null)} /> : null}
    </main>
  );
}

function OrderDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const [form, setForm] = useState({ fullName: "", contact: "", note: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    setState("sending");
    setError("");
    try {
      const response = await fetch("/api/ai/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug, ...form }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "ثبت سفارش انجام نشد.");
      setState("done");
    } catch (issue) {
      setState("error");
      setError(issue instanceof Error ? issue.message : "ثبت سفارش انجام نشد.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-[rgba(7,26,19,.36)]"
        onClick={onClose}
        aria-label="بستن"
      />
      <div className="relative w-full max-w-[440px] animate-toast-in rounded-card bg-white p-6 shadow-card">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-soft"
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>

        {state === "done" ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-soft text-green">
              <Check className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-[18px] font-bold">سفارش ثبت شد</h2>
            <p className="mt-2 text-[12px] leading-6 text-muted">
              کارشناس آساپی از همین راه ارتباطی با شما تماس می‌گیرد و مراحل پرداخت را می‌فرستد.
            </p>
            <button type="button" className="btn-ghost mt-5 w-full" onClick={onClose}>
              بستن
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-[18px] font-bold">ثبت سفارش {item.title}</h2>
            <p className="mt-1.5 text-[11.5px] text-muted">
              {item.priceToman
                ? `${fa(item.priceToman)} تومان / ${item.period}`
                : "قیمت پس از بررسی صورتحساب اعلام می‌شود"}
            </p>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xxs text-[#68747c]">نام و نام خانوادگی</span>
                <input
                  className="field"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xxs text-[#68747c]">
                  شماره تماس یا آیدی تلگرام
                </span>
                <input
                  className="field"
                  dir="ltr"
                  value={form.contact}
                  onChange={(event) => setForm({ ...form, contact: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xxs text-[#68747c]">توضیح (اختیاری)</span>
                <textarea
                  className="field h-24 resize-none py-2.5"
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="مثلاً ایمیل حسابی که باید روی آن فعال شود"
                />
              </label>
            </div>

            {error ? <p className="mt-3 text-[11.5px] text-danger">{error}</p> : null}

            <button
              type="button"
              className="btn-solid mt-5 w-full"
              onClick={submit}
              disabled={state === "sending" || !form.fullName.trim() || !form.contact.trim()}
            >
              {state === "sending" ? <Loader2 className="animate-spin" /> : null}
              ارسال سفارش
            </button>
          </>
        )}
      </div>
    </div>
  );
}
