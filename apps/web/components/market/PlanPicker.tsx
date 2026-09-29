"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, ShieldCheck } from "lucide-react";
import { fa } from "@qeymat/shared";
import CheckoutDialog from "./CheckoutDialog";
import type { CheckoutData } from "@/lib/pricing";

/**
 * انتخاب و خرید پلن وب‌سرویس — درگاه زرین‌پال یا کارت‌به‌کارت.
 * قیمت‌ها و پلن‌های فعال از پنل مدیریت می‌آیند.
 */
export default function PlanPicker({
  checkout,
  isLoggedIn,
  initialPlan = "quarterly",
}: {
  checkout: CheckoutData;
  isLoggedIn: boolean;
  initialPlan?: string;
}) {
  const router = useRouter();
  const PLANS = checkout.api;
  const [selected, setSelected] = useState(
    PLANS.some((item) => item.id === initialPlan) ? initialPlan : (PLANS[1] ?? PLANS[0])?.id ?? "",
  );
  const [paying, setPaying] = useState(false);

  const plan = PLANS.find((item) => item.id === selected);
  const monthly = PLANS.find((item) => item.monthCount === 1)?.price ?? PLANS[0]?.price ?? 0;

  const buy = () => {
    if (!plan) return;
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/developers?plan=${plan.id}`)}`);
      return;
    }
    setPaying(true);
  };

  return (
    <>
      <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((item) => {
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              aria-pressed={isSelected}
              className={`relative flex flex-col rounded-card border p-6 text-right transition-all ${
                isSelected
                  ? "border-green bg-surface shadow-card ring-1 ring-green/25"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              {item.popular ? (
                <em className="absolute -top-2.5 right-6 rounded-pill bg-green px-2.5 py-1 text-[10px] font-bold not-italic text-white">
                  پیشنهاد ما
                </em>
              ) : null}

              <span
                className={`absolute left-5 top-5 grid h-6 w-6 place-items-center rounded-full border ${
                  isSelected ? "border-green bg-green text-white" : "border-line text-transparent"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </span>

              <h3 className="text-[17px] font-bold">{item.label}</h3>
              <p className="mt-1 text-[11px] text-muted">{item.note}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <strong className="tabular text-[28px] font-extrabold tracking-[-1px]">
                  {fa(item.price)}
                </strong>
                <span className="text-[11px] text-muted">تومان</span>
              </div>
              {item.monthCount > 1 ? (
                <small className="mt-1 text-[11px] text-green">
                  ماهی {fa(Math.round(item.price / item.monthCount))} تومان —{" "}
                  {fa(Math.round((1 - item.price / item.monthCount / monthly) * 100))}٪ کمتر
                </small>
              ) : (
                <small className="mt-1 text-[11px] text-muted">ماهی {fa(item.price)} تومان</small>
              )}

              <ul className="mt-5 space-y-2.5 border-t border-line pt-4 text-[11.5px] text-sub">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-green" />
                  {item.requests} درخواست در {item.months}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-green" />
                  تمام نرخ‌های بازار
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-green" />
                  تاریخچه و تبدیل ارز
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-green" />
                  پشتیبانی با تیکت
                </li>
              </ul>
            </button>
          );
        })}
      </div>

      <button type="button" className="btn-solid mx-auto mt-9 flex h-12 px-7" onClick={buy} disabled={!plan}>
        <CreditCard />
        {plan ? `خرید پلن ${plan.label} — ${fa(plan.price)} تومان` : "پلنی برای فروش فعال نیست"}
      </button>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-green" />
        {checkout.methods.card && checkout.methods.zarinpal
          ? "پرداخت آنلاین با فعال‌سازی فوری یا کارت‌به‌کارت با ثبت فیش"
          : checkout.methods.card
            ? "کارت‌به‌کارت؛ اشتراک پس از تأیید فیش فعال می‌شود"
            : "پرداخت امن از درگاه زرین‌پال · فعال‌سازی فوری"}
      </p>

      {paying && plan ? (
        <CheckoutDialog
          kind="API_PLAN"
          plan={{ id: plan.id, label: plan.label, price: plan.price }}
          methods={checkout.methods}
          card={checkout.card}
          returnTo={`/developers?plan=${plan.id}`}
          onClose={() => setPaying(false)}
        />
      ) : null}
    </>
  );
}
