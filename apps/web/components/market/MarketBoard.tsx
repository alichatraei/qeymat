"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronLeft, Crown, Lock, RefreshCw, Repeat, Search, ShieldCheck } from "lucide-react";
import { CATEGORY_TABS, fa, movement, parseNumber, timeAgo } from "@qeymat/shared";
import RateIcon from "./RateIcon";
import PriceChart from "./PriceChart";
import RateDrawer from "./RateDrawer";
import type { AssetCategory, HistoryPoint, MarketSnapshot, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

export default function MarketBoard({
  initialSnapshot,
  initialHistory,
  initialCategory = "CURRENCY",
  initialHasPlus = false,
}: {
  initialSnapshot: MarketSnapshot;
  initialHistory: HistoryPoint[];
  initialCategory?: AssetCategory;
  initialHasPlus?: boolean;
}) {
  const [category, setCategory] = useState<AssetCategory>(initialCategory);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RateView | null>(null);

  // نرخ‌ها هر ۳۰ ثانیه تازه می‌شوند؛ داده‌ی اولیه از سرور می‌آید تا صفحه فوراً رندر شود
  const { data, isValidating, mutate } = useSWR<MarketSnapshot & { hasPlus?: boolean }>("/api/public/rates", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const snapshot = data ?? initialSnapshot;
  const hasPlus = data?.hasPlus ?? initialHasPlus;
  const usd = snapshot.assets.find((asset) => asset.symbol === "USD") ?? snapshot.assets[0];
  const lockedCount = snapshot.assets.filter((asset) => asset.locked).length;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return snapshot.assets
      .filter((asset) => asset.category === category)
      .filter((asset) =>
        term ? `${asset.nameFa} ${asset.symbol} ${asset.nameEn}`.toLowerCase().includes(term) : true,
      );
  }, [snapshot.assets, category, search]);

  return (
    <main className="bg-white pb-20 pt-10">
      <section className="content-width grid gap-10 border-b border-line pb-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)] lg:gap-14">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#55616a]">
            <span className="h-2 w-2 rounded-full bg-green-dot shadow-[0_0_0_4px_rgba(22,185,121,.1)]" />
            قیمت لحظه‌ای بازار ایران
            <button
              type="button"
              onClick={() => mutate()}
              className="mr-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-[#879197] hover:text-green-dark"
            >
              <RefreshCw className={`h-[13px] w-[13px] ${isValidating ? "animate-spin" : ""}`} />
              آخرین به‌روزرسانی {timeAgo(snapshot.updatedAt)}
            </button>
          </div>

          {usd ? (
            <>
              <div className="mt-7 grid items-center gap-6 sm:grid-cols-2">
                <div className="flex items-center gap-3.5">
                  <RateIcon rate={usd} size="large" />
                  <span>
                    <h1 className="text-[27px] font-bold tracking-[-.8px]">{usd.nameFa}</h1>
                    <small dir="ltr" className="block text-[12px] text-muted">
                      {usd.symbol} · {usd.sourceLabel}
                    </small>
                  </span>
                </div>
                <div className="flex flex-col sm:items-end">
                  <div className="flex items-end gap-2">
                    <strong className="tabular text-[clamp(38px,4vw,56px)] font-extrabold leading-none tracking-[-2.4px]">
                      {fa(usd.sell)}
                    </strong>
                    <span className="pb-1.5 text-[13px] text-[#66727b]">تومان</span>
                  </div>
                  <small
                    className={`mt-1.5 text-[12px] font-bold ${
                      usd.changePercent >= 0 ? "text-green" : "text-danger"
                    }`}
                  >
                    {movement(usd.changePercent)} امروز
                  </small>
                </div>
              </div>
              <PriceChart data={initialHistory} height={246} />
            </>
          ) : null}
        </div>

        <QuickConverter usd={usd} />
      </section>

      <section className="content-width pt-10">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-[24px] font-bold tracking-[-.5px]">نرخ‌های بازار</h2>
            <p className="mt-1.5 text-[12px] text-muted">قیمت فروش به تومان، همراه با تغییر روزانه</p>
          </div>
          <label className="flex h-11 w-full items-center gap-2.5 rounded-control border border-line bg-[#fbfcfb] px-3.5 text-[#89939a] md:w-[330px]">
            <Search className="h-[16px] w-[16px]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجوی ارز یا نماد"
              className="w-full border-0 bg-transparent text-[12px] text-ink outline-none"
              aria-label="جست‌وجوی دارایی"
            />
          </label>
        </div>

        <div className="table-scroll mt-6">
          <div className="inline-grid grid-flow-col gap-1 rounded-xl bg-[#f0f4f2] p-1" role="tablist">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              onClick={() => setCategory(tab.id as AssetCategory)}
              className={`inline-flex h-[38px] min-w-[92px] items-center justify-center gap-1.5 rounded-[9px] px-4 text-[12px] font-semibold transition-colors ${
                category === tab.id
                  ? "bg-green-soft text-green-dark shadow-[0_1px_3px_rgba(9,69,48,.06)]"
                  : "text-[#5d6870]"
              }`}
            >
              {tab.plus && !hasPlus ? <Crown className="h-3.5 w-3.5 text-amber" /> : null}
              {tab.label}
            </button>
            ))}
          </div>
        </div>

        {lockedCount && !hasPlus ? (
          <Link
            href="/plus"
            className="mt-4 flex items-center gap-3 rounded-card border border-[#f2e3c4] bg-[#fdf9ef] p-4 transition-colors hover:border-[#e8d3a6]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fdf3e2] text-[#a8741a]">
              <Crown className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-[12.5px]">{fa(lockedCount)} دارایی قفل است</b>
              <small className="text-[11px] text-muted">
                نفت، طلای جهانی، سهام اپل و تسلا و شاخص‌های بورس آمریکا با قیمت پلاس باز می‌شود.
              </small>
            </span>
            <span className="btn-solid h-9 min-h-0 shrink-0 !px-3 text-[11px]">مشاهده پلن‌ها</span>
          </Link>
        ) : null}

        <div className="table-scroll mt-4 border-y border-line">
          <div className="min-w-[850px]">
            <div className="grid grid-cols-[minmax(210px,1.35fr)_repeat(3,minmax(110px,.75fr))_minmax(130px,.8fr)_32px] items-center gap-x-3.5 text-xxs font-semibold text-[#89939a]">
              <span className="py-3.5">دارایی</span>
              <span>قیمت خرید</span>
              <span>قیمت فروش</span>
              <span>تغییر روز</span>
              <span>منبع</span>
              <span />
            </div>

            {rows.length ? (
              rows.map((rate) =>
                rate.locked ? (
                  // ردیف قفل عمداً حذف نمی‌شود: کاربر باید ببیند چه چیزی را نمی‌بیند
                  <Link
                    key={rate.symbol}
                    href="/plus"
                    className="grid w-full grid-cols-[minmax(210px,1.35fr)_repeat(3,minmax(110px,.75fr))_minmax(130px,.8fr)_32px] items-center gap-x-3.5 border-t border-line bg-white py-4 text-right text-[12px] text-[#3f4c55] transition-colors hover:bg-[#fdf9ef]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="opacity-45">
                        <RateIcon rate={rate} />
                      </span>
                      <span className="flex flex-col text-right">
                        <strong className="text-[13px] text-ink">{rate.nameFa}</strong>
                        <small dir="ltr" className="text-[10.5px] text-muted">
                          {rate.symbol}
                        </small>
                      </span>
                    </span>
                    <span className="col-span-3 flex items-center gap-2 text-[11.5px] text-[#a8741a]">
                      <Lock className="h-3.5 w-3.5" />
                      با قیمت پلاس باز می‌شود
                    </span>
                    <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                      {rate.sourceLabel}
                    </span>
                    <Crown className="h-4 w-4 text-amber" />
                  </Link>
                ) : (
                <button
                  key={rate.symbol}
                  type="button"
                  onClick={() => setSelected(rate)}
                  className="grid w-full grid-cols-[minmax(210px,1.35fr)_repeat(3,minmax(110px,.75fr))_minmax(130px,.8fr)_32px] items-center gap-x-3.5 border-t border-line bg-white py-4 text-right text-[12px] text-[#3f4c55] transition-colors hover:bg-[#f8fbf9]"
                >
                  <span className="flex items-center gap-3">
                    <RateIcon rate={rate} />
                    <span className="flex flex-col text-right">
                      <strong className="text-[13px] text-ink">{rate.nameFa}</strong>
                      <small dir="ltr" className="text-[10.5px] text-muted">
                        {rate.symbol}
                      </small>
                    </span>
                  </span>
                  <span className="tabular">
                    {fa(rate.buy)} <small className="text-muted">تومان</small>
                  </span>
                  <span className="tabular">
                    <strong className="text-[13px] text-ink">{fa(rate.sell)}</strong>{" "}
                    <small className="text-muted">تومان</small>
                  </span>
                  <span className={`font-bold ${rate.changePercent >= 0 ? "text-green" : "text-danger"}`}>
                    {movement(rate.changePercent)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11.5px]">
                    <i className="h-1.5 w-1.5 rounded-full bg-green-dot" />
                    {rate.sourceLabel}
                  </span>
                  <ChevronLeft className="h-4 w-4 text-[#a7b0b6]" />
                </button>
                ),
              )
            ) : (
              <div className="flex flex-col items-center gap-2 border-t border-line py-16 text-center">
                <Search className="h-6 w-6 text-[#b6bfc4]" />
                <strong className="text-[13px]">نرخی پیدا نشد</strong>
                <span className="text-[11.5px] text-muted">عبارت دیگری را جست‌وجو کنید.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {selected ? <RateDrawer rate={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}

function QuickConverter({ usd }: { usd: RateView | undefined }) {
  const [amount, setAmount] = useState("۱٬۰۰۰");
  const [result, setResult] = useState(0);

  useEffect(() => {
    setResult(parseNumber(amount) * (usd?.sell ?? 0));
  }, [amount, usd?.sell]);

  return (
    <aside className="card self-center p-6 shadow-card">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-green-soft text-green">
          <Repeat className="h-5 w-5" />
        </span>
        <div className="flex flex-col">
          <strong className="text-[16px]">تبدیل سریع</strong>
          <small className="text-xxs text-muted">دلار به تومان</small>
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-xxs text-[#68747c]">مبلغ دلار</span>
        <span className="flex h-[55px] items-center rounded-xl border border-[#dce4e1] bg-[#fbfcfb] px-3.5">
          <input
            value={amount}
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            className="tabular w-full min-w-0 flex-1 border-0 bg-transparent text-[23px] font-bold text-ink outline-none"
            aria-label="مبلغ دلار"
          />
          <b dir="ltr" className="font-mono text-[11px] font-semibold text-[#7a858c]">
            USD
          </b>
        </span>
      </label>

      <div className="my-4 border-y border-line py-4">
        <span className="block text-xxs text-muted">معادل تقریبی</span>
        <div className="mt-1.5 flex items-baseline justify-between">
          <strong className="tabular text-[25px] font-bold tracking-[-1px] text-green-dark">
            {fa(result)}
          </strong>
          <small className="text-[11px] text-muted">تومان</small>
        </div>
      </div>

      <Link href="/converter" className="btn-solid w-full">
        مبدل کامل
        <ChevronLeft />
      </Link>
      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-2xs text-[#758078]">
        <ShieldCheck className="h-3.5 w-3.5 text-green" />
        محاسبه با آخرین نرخ دریافت‌شده
      </p>
    </aside>
  );
}
