"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeftRight, ChartLine, ChevronLeft, RefreshCw, Search } from "lucide-react";
import { CATEGORY_TABS, DOLLAR_SYMBOLS, fa, timeAgo, unitLabel } from "@qeymat/shared";
import RateIcon from "./RateIcon";
import PriceChart, { formatPrice } from "./PriceChart";
import RateDrawer from "./RateDrawer";
import type { AssetCategory, HistoryPoint, HistorySeries, MarketSnapshot, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

const HERO_RANGES = [
  { id: "1d", label: "امروز" },
  { id: "1w", label: "هفته" },
  { id: "1m", label: "ماه" },
  { id: "1y", label: "سال" },
  { id: "10y", label: "۱۰ سال" },
];

export default function MarketBoard({
  initialSnapshot,
  initialHistory,
  initialCategory = "CURRENCY",
}: {
  initialSnapshot: MarketSnapshot;
  initialHistory: HistoryPoint[];
  initialCategory?: AssetCategory;
}) {
  const [chosenCategory, setCategory] = useState<AssetCategory>(initialCategory);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RateView | null>(null);
  const [heroRange, setHeroRange] = useState("1w");
  const [showAll, setShowAll] = useState(false);

  // نرخ‌ها هر ۳۰ ثانیه تازه می‌شوند؛ داده‌ی اولیه از سرور می‌آید تا صفحه فوراً رندر شود
  const { data, isValidating, mutate } = useSWR<MarketSnapshot>("/api/public/rates", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const { data: heroSeries, isLoading: heroLoading } = useSWR<{ series: HistorySeries }>(
    `/api/public/history?symbol=USD&range=${heroRange}`,
    fetcher,
    { keepPreviousData: true },
  );

  const snapshot = data ?? initialSnapshot;
  // دسته‌ای که هنوز هیچ نرخی ندارد (مثلاً سهام وقتی منبعش تنظیم نشده) نمایش داده نمی‌شود
  const tabs = useMemo(
    () => CATEGORY_TABS.filter((tab) => snapshot.assets.some((asset) => asset.category === tab.id)),
    [snapshot.assets],
  );
  const category = tabs.some((tab) => tab.id === chosenCategory)
    ? chosenCategory
    : ((tabs[0]?.id ?? "CURRENCY") as AssetCategory);
  const bySymbol = useMemo(
    () => new Map(snapshot.assets.map((asset) => [asset.symbol, asset])),
    [snapshot.assets],
  );
  const usd = bySymbol.get("USD");
  const dollarFamily = DOLLAR_SYMBOLS.filter((symbol) => symbol !== "USD")
    .map((symbol) => bySymbol.get(symbol))
    .filter(Boolean) as RateView[];

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return snapshot.assets
      .filter((asset) =>
        term
          ? `${asset.nameFa} ${asset.symbol} ${asset.nameEn}`.toLowerCase().includes(term)
          : asset.category === category &&
            // دلار و هم‌خانواده‌هایش بالای صفحه جدا نمایش داده می‌شوند
            !(category === "CURRENCY" && DOLLAR_SYMBOLS.includes(asset.symbol)) &&
            // صدها ارز جهان فقط با جست‌وجو یا «همه‌ی ارزها» دیده می‌شوند
            (showAll || asset.featured !== false),
      );
  }, [snapshot.assets, category, search, showAll]);
  const hiddenCount = snapshot.assets.filter(
    (asset) => asset.category === category && asset.featured === false,
  ).length;

  const heroPoints = heroSeries?.series?.points ?? (heroRange === "1w" ? initialHistory : []);

  return (
    <main className="pb-20">
      {/* ------------------------- دلار، جدا از بقیه ------------------------- */}
      <section className="hero-bg relative overflow-hidden text-white">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="content-width relative grid gap-8 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:py-14">
          <div className="min-w-0 animate-rise-in">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-white/75">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-green-dot" />
              قیمت دلار — نرخ تحلیلی «قیمت»
              <button
                type="button"
                onClick={() => mutate()}
                className="mr-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-white/60 hover:text-white"
              >
                <RefreshCw className={`h-[13px] w-[13px] ${isValidating ? "animate-spin" : ""}`} />
                {timeAgo(snapshot.updatedAt)}
              </button>
            </div>

            {usd ? (
              <button
                type="button"
                onClick={() => setSelected(usd)}
                className="mt-6 block text-right"
                aria-label="جزئیات دلار آمریکا"
              >
                <span className="flex items-center gap-3.5">
                  <RateIcon rate={usd} size="large" />
                  <span>
                    <h1 className="text-[26px] font-bold tracking-[-.8px]">دلار آمریکا</h1>
                    <small className="block text-[12px] text-white/60">نقدی تهران · USD</small>
                  </span>
                </span>

                <span className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-2">
                  <strong className="tabular text-[clamp(44px,6vw,68px)] font-extrabold leading-none tracking-[-2.6px]">
                    {fa(usd.sell)}
                  </strong>
                  <span className="pb-2 text-[14px] text-white/70">تومان</span>
                  <ChevronLeft className="mb-2.5 h-5 w-5 text-white/50" />
                </span>
              </button>
            ) : (
              <p className="mt-6 text-white/70">نرخ دلار هنوز دریافت نشده است.</p>
            )}

            {/* خانواده‌ی دلار: فردایی، هرات، تتر */}
            {dollarFamily.length ? (
              <div className="mt-7 grid grid-cols-3 gap-2.5">
                {dollarFamily.map((rate) => (
                  <button
                    key={rate.symbol}
                    type="button"
                    onClick={() => setSelected(rate)}
                    className="glass flex flex-col items-start gap-1 p-3.5 text-right transition-colors hover:bg-white/[.1]"
                  >
                    <span className="text-[11px] text-white/65">{rate.nameFa}</span>
                    <strong className="tabular text-[19px] font-bold tracking-[-.5px]">{fa(rate.sell)}</strong>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="glass min-w-0 animate-rise-in self-center p-4 sm:p-5 [animation-delay:80ms]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong className="text-[13px]">روند دلار</strong>
              <div className="inline-grid grid-flow-col gap-1 rounded-xl bg-white/[.07] p-1">
                {HERO_RANGES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHeroRange(item.id)}
                    className={`h-8 rounded-[8px] px-2.5 text-[11px] font-semibold transition-colors ${
                      heroRange === item.id ? "bg-white text-brand" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-surface/95 px-1 pb-1 pt-0.5 text-ink">
              {heroLoading && !heroPoints.length ? (
                <div className="mt-5 h-[230px] animate-pulse rounded-2xl bg-soft" />
              ) : (
                <PriceChart
                  data={heroPoints}
                  height={230}
                  compactAxis={heroRange === "10y"}
                  interval={heroSeries?.series?.interval ?? "day"}
                />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/chart?symbol=USD" className="btn-solid h-10 min-h-0 flex-1">
                <ChartLine />
                نمودار کامل و مقایسه
              </Link>
              <Link
                href="/converter"
                className="btn h-10 min-h-0 flex-1 border border-white/20 bg-white/[.06] text-white hover:bg-white/[.12]"
              >
                <ArrowLeftRight />
                تبدیل ارز
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- بقیه‌ی بازار --------------------------- */}
      <section className="content-width pt-10">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-[24px] font-bold tracking-[-.5px]">
              {category === "CURRENCY" && !search ? "سایر ارزها" : "نرخ‌های بازار"}
            </h2>
            <p className="mt-1.5 text-[12px] text-muted">
              روی هر کارت بزنید تا نمودار، قیمت خرید و فروش، کمترین و بیشترین و هشدار قیمت را ببینید
            </p>
          </div>
          <label className="flex h-11 w-full items-center gap-2.5 rounded-control border border-line bg-field px-3.5 text-faint md:w-[330px]">
            <Search className="h-[16px] w-[16px]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجو در همه‌ی دارایی‌ها"
              className="w-full border-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-faint"
              aria-label="جست‌وجوی دارایی"
            />
          </label>
        </div>

        <div className="table-scroll mt-6">
          <div className="segmented" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={category === tab.id}
                data-active={category === tab.id && !search}
                onClick={() => {
                  setCategory(tab.id as AssetCategory);
                  setSearch("");
                }}
                className="min-w-[88px] !h-[38px] !px-4 !text-[12px]"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rows.map((rate) => (
              <RateCard key={rate.symbol} rate={rate} onOpen={() => setSelected(rate)} />
            ))}
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-card border border-dashed border-line py-14 text-center">
            <Search className="h-6 w-6 text-faint" />
            <strong className="text-[13px]">نرخی پیدا نشد</strong>
            <span className="text-[11.5px] text-muted">عبارت دیگری را جست‌وجو کنید.</span>
          </div>
        )}

        {hiddenCount && !search ? (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-control border border-dashed border-line-strong text-[12px] font-semibold text-sub transition-colors hover:text-ink"
          >
            {showAll ? "فقط ارزهای اصلی" : `همه‌ی ارزهای جهان · ${fa(hiddenCount)} ارز دیگر`}
          </button>
        ) : null}
      </section>

      {selected ? <RateDrawer rate={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}

/**
 * کارت یک دارایی: فقط نشانه، نام و قیمت. تغییر روز، خرید، کف و سقف و
 * نمودار با زدن روی کارت در صفحه‌ی جزئیات دیده می‌شود.
 */
function RateCard({ rate, onOpen }: { rate: RateView; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-3.5 text-right transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card active:scale-[.98]"
    >
      <span className="flex items-center gap-2.5">
        <RateIcon rate={rate} />
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-[12.5px] text-ink">{rate.nameFa}</strong>
          <small dir="ltr" className="block text-right text-[10px] text-faint">
            {rate.symbol}
          </small>
        </span>
      </span>
      <span className="flex items-baseline gap-1">
        <strong className="tabular truncate text-[17px] font-extrabold tracking-[-.4px] text-ink">
          {formatPrice(rate.sell)}
        </strong>
        <small className="shrink-0 text-[10.5px] text-muted">{unitLabel(rate.unit)}</small>
      </span>
    </button>
  );
}
