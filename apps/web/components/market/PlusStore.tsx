"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, Check, Crown, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { PLUS_FEATURES, PLUS_TIERS, fa, jalali } from "@qeymat/shared";
import CheckoutDialog from "./CheckoutDialog";
import type { CheckoutData } from "@/lib/pricing";

const PERKS = [
  { icon: Sparkles, title: "تحلیل قیمت", note: "روند، RSI، میانگین‌ها، حمایت و مقاومت، حباب سکه" },
  { icon: MessageSquareText, title: "هشدار پیامکی", note: "پلاس ۱۰ شاخص، حرفه‌ای ۵۰ شاخص" },
  { icon: BarChart3, title: "بازدهی تا ۱۰ سال", note: "مقایسه‌ی دارایی‌ها در یک نگاه" },
  { icon: Bell, title: "اعلان مرورگر", note: "برای همه‌ی کاربران واردشده رایگان است" },
];

export default function PlusStore({
  isLoggedIn,
  hasPlus,
  expiresAt,
  currentTier,
  checkout,
}: {
  isLoggedIn: boolean;
  hasPlus: boolean;
  expiresAt: string | null;
  currentTier: "plus" | "pro" | null;
  /** پلن‌های فعال با قیمت پنل مدیریت و روش‌های پرداخت */
  checkout: CheckoutData;
}) {
  const router = useRouter();
  const [tier, setTier] = useState<"plus" | "pro">(currentTier === "pro" ? "pro" : "plus");
  const [selected, setSelected] = useState(currentTier === "pro" ? "pro-quarterly" : "plus-quarterly");
  const [paying, setPaying] = useState(false);

  // سطح‌هایی که دست‌کم یک پلن فعال دارند
  const tiers = PLUS_TIERS.filter((item) => checkout.plus.some((plan) => plan.tier === item.id)).map((item) => ({
    ...item,
    smsAlerts: checkout.plus.find((plan) => plan.tier === item.id)?.smsAlerts ?? item.smsAlerts,
  }));
  const plans = checkout.plus.filter((item) => item.tier === tier);
  const plan = plans.find((item) => item.id === selected) ?? plans[1] ?? plans[0];
  const monthly = plans[0]?.price ?? 0;

  // لینک مستقیم به پلن حرفه‌ای: /plus#pro
  useEffect(() => {
    if (window.location.hash === "#pro") {
      setTier("pro");
      setSelected("pro-quarterly");
    }
  }, []);

  const buy = () => {
    if (!isLoggedIn) {
      router.push("/login?next=/plus");
      return;
    }
    setPaying(true);
  };

  return (
    <main className="pb-20">
      {/* هیروی برند فاز ۲: آرام، بدون فوریت؛ نقش نشانه در گوشه */}
      <section className="relative overflow-hidden bg-brand-deep text-brand-cream">
        <svg className="pointer-events-none absolute -left-20 -top-20 h-[340px] w-[340px] opacity-[.07]" viewBox="12 12 37 38" aria-hidden="true">
          <path d="M45.86 37.90 A17.5 17.5 0 1 0 29.39 47.99 L29.65 40.49 A10 10 0 1 1 39.06 34.73 Z" fill="currentColor" />
          <path d="M28.39 47.88 L28.39 34.30 L29.39 33.70 L35.79 28.90 L35.79 47.01 A17.5 17.5 0 0 1 28.39 47.88 Z" fill="currentColor" />
        </svg>
        <div className="content-width relative py-12">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-brand-mint))" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18.93 16A8 8 0 1 0 16 18.93M12 8.5v7M8.5 12h7" />
          </svg>
          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.25] tracking-[-1.2px]">قیمت پلاس</h1>
          <p className="mt-3 max-w-[54ch] text-[13.5px] leading-7 text-brand-cream/80">
            همهٔ قیمت‌ها رایگان است و رایگان می‌ماند. پلاس تحلیل هر دارایی را کنارش می‌گذارد و وقتی
            قیمت به هدفتان رسید، حتی اگر مرورگر بسته باشد، پیامک می‌فرستد.
          </p>
          {hasPlus ? (
            <div className="mt-6 inline-flex items-center gap-3 rounded-[16px] border border-brand-cream/20 bg-brand-cream/[.05] p-4">
              <Check className="h-5 w-5 shrink-0 text-brand-mint" />
              <span className="flex flex-col">
                <b className="text-[12.5px]">اشتراک شما فعال است</b>
                <small className="text-[11px] text-brand-cream/70">
                  {expiresAt ? `تا ${jalali(expiresAt)}` : "فعال"} — تمدید از انتهای همین تاریخ اعمال می‌شود.
                </small>
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="content-width pt-10">
        <div className="card grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((perk) => (
            <div key={perk.title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
                <perk.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex flex-col">
                <b className="text-[12.5px]">{perk.title}</b>
                <small className="text-[11px] text-muted">{perk.note}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* آنچه می‌گیرید */}
      <section className="mt-14 border-y border-line bg-field py-10">
        <div className="content-width">
          <h2 className="text-[20px] font-bold tracking-[-.5px]">با قیمت پلاس چه می‌گیرید</h2>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {PLUS_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[12px] text-sub">
                <Check className="h-4 w-4 shrink-0 text-green" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* پلن‌ها */}
      <section className="content-width pt-14">
        <div className="mx-auto max-w-[44ch] text-center">
          <h2 className="text-[26px] font-extrabold tracking-[-.8px]">پلن خود را انتخاب کنید</h2>
          <p className="mt-3 text-[12.5px] leading-6 text-muted">
            تفاوت دو سطح فقط در تعداد شاخص‌هایی است که می‌توانید رویشان هشدار پیامکی بگذارید.
          </p>
        </div>

        <div id="pro" className="mx-auto mt-7 grid max-w-[620px] gap-3 sm:grid-cols-2">
          {tiers.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTier(item.id);
                setSelected(`${item.id}-quarterly`);
              }}
              aria-pressed={tier === item.id}
              className={`flex flex-col items-start rounded-card border p-4 text-right transition-all ${
                tier === item.id
                  ? item.id === "pro"
                    ? "border-brand bg-brand text-brand-cream shadow-glow"
                    : "border-green bg-green-soft"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <span className="flex items-center gap-1.5 text-[14px] font-bold">
                <Crown className={`h-4 w-4 ${item.id === "pro" ? "text-brand-mint" : "text-amber"}`} />
                {item.label}
              </span>
              <span className={`mt-1 text-[11.5px] ${tier === item.id && item.id === "pro" ? "text-brand-cream/80" : "text-muted"}`}>
                هشدار پیامکی برای {fa(item.smsAlerts)} شاخص
              </span>
            </button>
          ))}
        </div>

        <div className="mx-auto mt-6 grid max-w-[900px] gap-4 md:grid-cols-3">
          {plans.map((item) => {
            const isSelected = plan?.id === item.id;
            const perMonth = Math.round(item.price / item.monthCount);
            const saving = Math.round(((monthly - perMonth) / monthly) * 100);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                aria-pressed={isSelected}
                className={`relative flex flex-col rounded-card border p-6 text-right transition-all ${
                  isSelected
                    ? "border-purple bg-surface shadow-card ring-1 ring-[rgb(var(--c-purple))]"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                {item.popular ? (
                  <em className="absolute -top-2.5 right-6 rounded-pill bg-purple px-2.5 py-1 text-[10px] font-bold not-italic text-white">
                    محبوب‌ترین
                  </em>
                ) : null}

                <span
                  className={`absolute left-5 top-5 grid h-6 w-6 place-items-center rounded-full border ${
                    isSelected ? "border-purple bg-purple text-white" : "border-line text-transparent"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>

                <h3 className="text-[17px] font-bold">{item.label}</h3>
                <p className="mt-1 text-[11px] text-muted">{item.note}</p>
                <p className="mt-1 text-[11px] text-sub">پیامک برای {fa(item.smsAlerts)} شاخص</p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <strong className="tabular text-[26px] font-extrabold tracking-[-1px]">
                    {fa(item.price)}
                  </strong>
                  <span className="text-[11px] text-muted">تومان</span>
                </div>

                {item.monthCount > 1 ? (
                  <small className="mt-1.5 text-[11px] text-green">
                    ماهی {fa(perMonth)} تومان — {fa(saving)}٪ کمتر
                  </small>
                ) : (
                  <small className="mt-1.5 text-[11px] text-muted">ماهی {fa(perMonth)} تومان</small>
                )}
              </button>
            );
          })}
        </div>

        {!plan ? (
          <p className="mt-6 text-center text-[12px] text-muted">در حال حاضر پلنی برای فروش فعال نیست.</p>
        ) : null}

        <button
          type="button"
          className="btn-solid mx-auto mt-8 flex h-12 px-8"
          onClick={buy}
          disabled={!plan}
        >
          <Crown />
          {!plan
            ? "انتخاب پلن"
            : hasPlus
              ? currentTier === "plus" && tier === "pro"
                ? `ارتقا به حرفه‌ای — ${fa(plan.price)} تومان`
                : `تمدید — ${fa(plan.price)} تومان`
              : `خرید ${tier === "pro" ? "پلاس حرفه‌ای" : "پلاس"} ${plan.label}`}
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-green" />
          {checkout.methods.zarinpal && checkout.methods.card
            ? "پرداخت آنلاین از زرین‌پال یا کارت‌به‌کارت با ثبت فیش"
            : checkout.methods.card
              ? "پرداخت کارت‌به‌کارت؛ اشتراک پس از تأیید فیش فعال می‌شود"
              : "پرداخت امن از درگاه زرین‌پال؛ اطلاعات کارت روی سایت ما ذخیره نمی‌شود"}
        </p>

        {!isLoggedIn ? (
          <p className="mt-3 text-center text-[11px] text-muted">
            برای خرید ابتدا{" "}
            <Link href="/login?next=/plus" className="font-semibold text-green-dark hover:underline">
              با شماره موبایل وارد شوید
            </Link>
            .
          </p>
        ) : null}
      </section>
      {paying && plan ? (
        <CheckoutDialog
          kind="PLUS_PLAN"
          plan={{ id: plan.id, label: `${tier === "pro" ? "پلاس حرفه‌ای" : "پلاس"} ${plan.label}`, price: plan.price }}
          methods={checkout.methods}
          card={checkout.card}
          returnTo="/plus"
          onClose={() => setPaying(false)}
        />
      ) : null}
    </main>
  );
}
