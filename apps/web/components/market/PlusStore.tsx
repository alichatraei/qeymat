"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, Check, Crown, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import { PLUS_PLANS, PLUS_FEATURES, fa, jalali } from "@qeymat/shared";

type PremiumAsset = {
  symbol: string;
  nameFa: string;
  category: string;
  mark: string | null;
  countryCode: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  COMMODITY: "کالا و انرژی",
  STOCK: "سهام جهانی",
  INDEX: "شاخص‌ها",
  CURRENCY: "ارزهای بیشتر",
  CRYPTO: "رمزارزهای بیشتر",
  GOLD: "طلای بیشتر",
};

const PERKS = [
  { icon: TrendingUp, title: "بازارهای جهانی", note: "نفت، فلزات، سهام و شاخص‌ها" },
  { icon: BarChart3, title: "تاریخچه‌ی یک‌ساله", note: "به‌جای ۷ روز در نسخه رایگان" },
  { icon: Bell, title: "هشدار نامحدود", note: "روی هر دارایی، بدون سقف" },
];

export default function PlusStore({
  isLoggedIn,
  hasPlus,
  expiresAt,
  assets,
}: {
  isLoggedIn: boolean;
  hasPlus: boolean;
  expiresAt: string | null;
  assets: PremiumAsset[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("plus-quarterly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = PLUS_PLANS.find((item) => item.id === selected) ?? PLUS_PLANS[1];
  const monthly = PLUS_PLANS[0].price;

  const groups = assets.reduce<Record<string, PremiumAsset[]>>((accumulator, asset) => {
    (accumulator[asset.category] ||= []).push(asset);
    return accumulator;
  }, {});

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
        body: JSON.stringify({ kind: "PLUS_PLAN", plan: selected }),
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
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#fdf3e2] px-3 py-1.5 text-[11px] font-bold text-[#a8741a]">
            <Crown className="h-3.5 w-3.5" />
            قیمت پلاس
          </span>
          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.25] tracking-[-1.2px]">
            بازارهای جهانی را هم ببینید
          </h1>
          <p className="mt-4 text-[13px] leading-7 text-muted">
            نرخ ارز و طلا و رمزارزهای اصلی همیشه رایگان می‌ماند. قیمت پلاس دری است به نفت، فلزات
            جهانی، سهام شرکت‌های بزرگ و شاخص‌های بورس آمریکا — همان‌جایی که بازار ایران را از دور
            هدایت می‌کند.
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

        <div className="card grid gap-4 p-6 shadow-card">
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

      {/* آنچه باز می‌شود */}
      <section className="mt-14 border-y border-line bg-[#fbfcfb] py-10">
        <div className="content-width">
          <h2 className="text-[20px] font-bold tracking-[-.5px]">
            {fa(assets.length)} دارایی که با پلاس باز می‌شود
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groups).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-[12px] font-bold text-green-dark">
                  {CATEGORY_LABEL[category] ?? category}
                </h3>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {items.map((asset) => (
                    <li
                      key={asset.symbol}
                      className="rounded-[9px] border border-line bg-white px-2.5 py-1.5 text-[11px] text-[#4c5760]"
                    >
                      {asset.nameFa}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <ul className="mt-8 grid gap-2.5 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLUS_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[12px] text-[#4c5760]">
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
          <h2 className="text-[26px] font-extrabold tracking-[-.8px]">یک اشتراک، همه‌ی بازارها</h2>
          <p className="mt-3 text-[12.5px] leading-6 text-muted">
            پرداخت امن از درگاه زرین‌پال. هر زمان خواستید می‌توانید تمدید نکنید.
          </p>
        </div>

        <div className="mx-auto mt-9 grid max-w-[900px] gap-4 md:grid-cols-3">
          {PLUS_PLANS.map((item) => {
            const isSelected = selected === item.id;
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
                    ? "border-green bg-white shadow-card ring-1 ring-green/25"
                    : "border-line bg-white hover:border-[#cbd6d1]"
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
          {hasPlus ? `تمدید — ${fa(plan.price)} تومان` : `خرید اشتراک ${plan.label}`}
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
