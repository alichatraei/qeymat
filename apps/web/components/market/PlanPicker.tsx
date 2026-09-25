"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Check, ChevronLeft } from "lucide-react";
import { PLANS, fa } from "@qeymat/shared";
import type { MarketSnapshot } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

export default function PlanPicker() {
  const router = useRouter();
  const [selected, setSelected] = useState("quarterly");
  const { data } = useSWR<MarketSnapshot>("/api/public/rates", fetcher, { refreshInterval: 60000 });

  const usdt = data?.assets.find((asset) => asset.symbol === "USDT")?.sell ?? 0;
  const plan = PLANS.find((item) => item.id === selected);

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
                <strong className="tabular text-[32px] font-extrabold tracking-[-1.2px]">
                  {item.price}
                </strong>
                <span dir="ltr" className="font-mono text-[12px] text-muted">
                  USDT
                </span>
              </div>
              {usdt ? (
                <small className="mt-1 text-[11px] text-muted">≈ {fa(item.price * usdt)} تومان</small>
              ) : null}

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
                  پشتیبانی ایمیلی
                </li>
              </ul>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn-solid mx-auto mt-9 flex h-12 px-7"
        onClick={() => router.push(`/dashboard?plan=${selected}`)}
      >
        خرید پلن {plan?.label}
        <ChevronLeft />
      </button>
    </>
  );
}
