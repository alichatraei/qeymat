"use client";

import { useState } from "react";
import { Check, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { PLANS, fa } from "@qeymat/shared";
import { startCheckout } from "@/lib/checkout";

/**
 * انتخاب و خرید پلن وب‌سرویس. پرداخت مستقیم از درگاه زرین‌پال؛ بعد از
 * پرداخت موفق اشتراک همان لحظه فعال می‌شود و کاربر به پنل توسعه‌دهنده می‌رود.
 */
export default function PlanPicker({ initialPlan = "quarterly" }: { initialPlan?: string }) {
  const [selected, setSelected] = useState(PLANS.some((item) => item.id === initialPlan) ? initialPlan : "quarterly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = PLANS.find((item) => item.id === selected);
  const monthly = PLANS[0].price;

  const buy = async () => {
    if (!plan) return;
    setLoading(true);
    setError("");
    const failure = await startCheckout("API_PLAN", plan.id, `/developers?plan=${plan.id}`);
    if (failure) {
      setError(failure);
      setLoading(false);
    }
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
                  تاریخچه و مبدل
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

      {error ? <p className="mt-5 text-center text-[12px] text-danger">{error}</p> : null}

      <button type="button" className="btn-solid mx-auto mt-9 flex h-12 px-7" onClick={buy} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {plan ? `پرداخت ${fa(plan.price)} تومان — پلن ${plan.label}` : "انتخاب پلن"}
      </button>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-green" />
        پرداخت امن از درگاه زرین‌پال · فعال‌سازی فوری پس از پرداخت
      </p>
    </>
  );
}
