"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowLeftRight, Clock } from "lucide-react";
import { fa, parseNumber, clock } from "@qeymat/shared";
import RateIcon from "./RateIcon";
import type { MarketSnapshot, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());
const QUICK = [100, 500, 1000, 5000];

export default function ConverterBoard({
  initialSnapshot,
  initialSymbol = "USD",
}: {
  initialSnapshot: MarketSnapshot;
  initialSymbol?: string;
}) {
  const { data } = useSWR<MarketSnapshot>("/api/public/rates", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 60000,
  });

  const assets = (data ?? initialSnapshot).assets;
  const [symbol, setSymbol] = useState(initialSymbol);
  const [amount, setAmount] = useState("۱٬۰۰۰");
  const [direction, setDirection] = useState<"to-toman" | "from-toman">("to-toman");

  const rate: RateView | undefined = useMemo(
    () => assets.find((asset) => asset.symbol === symbol) ?? assets[0],
    [assets, symbol],
  );

  const value = parseNumber(amount);
  const result = rate ? (direction === "to-toman" ? value * rate.sell : value / rate.sell) : 0;

  const popular = assets.filter((asset) => asset.category === "CURRENCY").slice(0, 5);

  return (
    <main className="pb-20 pt-12">
      <section className="content-width max-w-[980px]">
        <div className="max-w-[52ch]">
          <span className="text-[11.5px] font-bold text-green-dark">مبدل هوشمند</span>
          <h1 className="mt-2 text-[32px] font-extrabold tracking-[-1.1px]">
            هر ارزی را به تومان تبدیل کنید
          </h1>
          <p className="mt-3 text-[13px] leading-7 text-muted">
            نرخ تازه بازار، محاسبه‌ی فوری و امکان تبدیل در هر دو جهت.
          </p>
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.8fr)]">
          <div className="card p-6 shadow-card">
            <label className="block">
              <span className="mb-2 block text-xxs text-[#68747c]">مبلغ</span>
              <input
                value={amount}
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                className="tabular h-[62px] w-full rounded-xl border border-[#dce4e1] bg-[#fbfcfb] px-4 text-[26px] font-bold outline-none focus:border-[#bcd5c9] focus:bg-white"
                aria-label="مبلغ"
              />
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="mb-2 block text-xxs text-[#68747c]">
                  {direction === "to-toman" ? "ارز مبدأ" : "ارز مقصد"}
                </span>
                <select
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  className="field"
                  aria-label="انتخاب دارایی"
                >
                  {assets.map((asset) => (
                    <option key={asset.symbol} value={asset.symbol}>
                      {asset.nameFa} · {asset.symbol}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setDirection((current) => (current === "to-toman" ? "from-toman" : "to-toman"))}
                className="btn-ghost self-end"
                title="جابه‌جایی جهت تبدیل"
              >
                <ArrowLeftRight />
                {direction === "to-toman" ? "به تومان" : "از تومان"}
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-line bg-[#fbfcfb] p-5">
              <span className="block text-xxs text-muted">
                {direction === "to-toman" ? "معادل بر اساس نرخ فروش" : `معادل به ${rate?.symbol ?? ""}`}
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <strong className="tabular text-[34px] font-extrabold tracking-[-1.4px] text-green-dark">
                  {direction === "to-toman"
                    ? fa(Math.round(result))
                    : result.toLocaleString("fa-IR", { maximumFractionDigits: 4 })}
                </strong>
                <small className="text-[12px] text-muted">
                  {direction === "to-toman" ? "تومان" : rate?.symbol}
                </small>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(fa(quick))}
                  className="rounded-[10px] border border-line bg-white px-3 py-2 text-[11.5px] font-semibold text-[#4c5760] hover:border-[#cbd6d1] hover:bg-soft"
                >
                  {fa(quick)} {direction === "to-toman" ? rate?.symbol : "تومان"}
                </button>
              ))}
            </div>

            {rate ? (
              <p className="mt-5 flex items-center gap-2 text-[11px] text-muted">
                <Clock className="h-3.5 w-3.5" />
                هر {rate.nameFa} در ساعت {clock(rate.fetchedAt)} برابر {fa(rate.sell)} تومان است.
              </p>
            ) : null}
          </div>

          <aside className="card p-5">
            <h2 className="text-[14px] font-bold">نرخ‌های پرکاربرد</h2>
            <div className="mt-3 space-y-1.5">
              {popular.map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setSymbol(item.symbol)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition-colors ${
                    symbol === item.symbol
                      ? "border-green-soft bg-green-soft"
                      : "border-transparent hover:bg-soft"
                  }`}
                >
                  <RateIcon rate={item} size="small" />
                  <span className="flex flex-1 flex-col">
                    <strong className="text-[12.5px]">{item.nameFa}</strong>
                    <small dir="ltr" className="text-[10px] text-muted">
                      {item.symbol}
                    </small>
                  </span>
                  <b className="tabular text-[12.5px] font-bold">{fa(item.sell)}</b>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
