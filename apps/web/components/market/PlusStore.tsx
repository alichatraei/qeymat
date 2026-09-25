"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, Check, Crown, Loader2, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { PLUS_PLANS, PLUS_FEATURES, PLUS_TIERS, fa, jalali } from "@qeymat/shared";

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
}: {
  isLoggedIn: boolean;
  hasPlus: boolean;
  expiresAt: string | null;
  currentTier: "plus" | "pro" | null;
}) {
  const router = useRouter();
  const [tier, setTier] = useState<"plus" | "pro">(currentTier === "pro" ? "pro" : "plus");
  const [selected, setSelected] = useState(currentTier === "pro" ? "pro-quarterly" : "plus-quarterly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plans = PLUS_PLANS.filter((item) => item.tier === tier);
  const plan = plans.find((item) => item.id === selected) ?? plans[1] ?? plans[0];
  const monthly = plans[0].price;

  // لینک مستقیم به پلن حرفه‌ای: /plus#pro
  useEffect(() => {
    if (window.location.hash === "#pro") {
      setTier("pro");
      setSelected("pro-quarterly");
    }
  }, []);

  const buy = async () => {
    if (!isLoggedIn) {
      router.push("/login?next=/plus");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "PLUS_PLAN", plan: plan.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message);
      window.location.href = payload.redirectUrl;
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "اتصال به درگاه انجام نشد.");
      setLoading(false);
    }
  };

  return (
    <main className="pb-20 pt-12">
      <section className="content-width grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.72fr)] lg:items-center">
        <div className="max-w-[54ch]">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-soft px-3 py-1.5 text-[11px] font-bold text-amber-ink">
            <Crown className="h-3.5 w-3.5" />
            قیمت پلاس
          </span>
          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.25] tracking-[-1.2px]">
            قیمت را ببینید، <span className="text-green">بازار را بفهمید</span>
          </h1>
          <p className="mt-4 text-[13px] leading-7 text-muted">
            همه‌ی قیمت‌ها در «قیمت» رایگان است و رایگان می‌ماند. قیمت پلاس تحلیل هر دارایی را کنارش
            می‌گذارد — روند، مومنتوم، حباب سکه، حمایت و مقاومت — و وقتی قیمت به هدفتان رسید، حتی
            اگر مرورگر بسته باشد، پیامک می‌فرستد.
          </p>

          {hasPlus ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-green-soft bg-green-soft/60 p-4">
              <Check className="h-5 w-5 shrink-0 text-green-dark" />
              <span className="flex flex-col">
                <b className="text-[12.5px]">اشتراک شما فعال است</b>
                <small className="text-[11px] text-muted">
                  {expiresAt ? `تا ${jalali(expiresAt)}` : "فعال"} — تمدید از انتهای همین تاریخ اعمال
                  می‌شود.
                </small>
              </span>
            </div>
          ) : null}
        </div>

        <div className="card grid gap-4 p-6 shadow-card sm:grid-cols-2 lg:grid-cols-1">
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
          {PLUS_TIERS.map((item) => (
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
            const isSelected = plan.id === item.id;
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

        {error ? <p className="mt-5 text-center text-[12px] text-danger">{error}</p> : null}

        <button
          type="button"
          className="btn-solid mx-auto mt-8 flex h-12 px-8"
          onClick={buy}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Crown />}
          {hasPlus
            ? currentTier === "plus" && tier === "pro"
              ? `ارتقا به حرفه‌ای — ${fa(plan.price)} تومان`
              : `تمدید — ${fa(plan.price)} تومان`
            : `خرید ${tier === "pro" ? "پلاس حرفه‌ای" : "پلاس"} ${plan.label}`}
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-green" />
          پرداخت از درگاه زرین‌پال؛ اطلاعات کارت روی سایت ما ذخیره نمی‌شود
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
    </main>
  );
}
