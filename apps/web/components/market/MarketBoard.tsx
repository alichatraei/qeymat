"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeftRight,
  ChartLine,
  ChevronLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { CATEGORY_TABS, DOLLAR_SYMBOLS, fa, movement, timeAgo, unitLabel } from "@qeymat/shared";
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

/** دارایی‌های نوار بالای جدول */
const TICKER = ["GOLD18", "EMAMI", "ABSHODEH", "EUR", "USDT", "BTC"];

export default function MarketBoard({
  initialSnapshot,
  initialHistory,
  initialCategory = "CURRENCY",
}: {
  initialSnapshot: MarketSnapshot;
  initialHistory: HistoryPoint[];
  initialCategory?: AssetCategory;
}) {
  const [category, setCategory] = useState<AssetCategory>(initialCategory);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RateView | null>(null);
  const [heroRange, setHeroRange] = useState("1w");

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
            !(category === "CURRENCY" && DOLLAR_SYMBOLS.includes(asset.symbol)),
      );
  }, [snapshot.assets, category, search]);

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
              <>
                <div className="mt-6 flex items-center gap-3.5">
                  <RateIcon rate={usd} size="large" />
                  <span>
                    <h1 className="text-[26px] font-bold tracking-[-.8px]">دلار آمریکا</h1>
                    <small className="block text-[12px] text-white/60">نقدی تهران · USD</small>
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <strong className="tabular text-[clamp(44px,6vw,68px)] font-extrabold leading-none tracking-[-2.6px]">
                    {fa(usd.sell)}
                  </strong>
                  <span className="pb-2 text-[14px] text-white/70">تومان</span>
                  <span
                    className={`mb-2 inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[12px] font-bold ${
                      usd.changePercent >= 0 ? "bg-green-dot/20 text-[#8ff0c4]" : "bg-danger/25 text-[#ffb3b5]"
                    }`}
                  >
                    {usd.changePercent >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {movement(usd.changePercent)} امروز
                  </span>
                </div>

                <dl className="mt-6 grid max-w-[520px] grid-cols-3 gap-2">
                  <HeroStat label="خرید" value={fa(usd.buy)} />
                  <HeroStat label="کمترین امروز" value={usd.dayLow ? fa(usd.dayLow) : "—"} />
                  <HeroStat label="بیشترین امروز" value={usd.dayHigh ? fa(usd.dayHigh) : "—"} />
                </dl>

                {usd.sourceCount ? (
                  <p className="mt-4 flex items-center gap-1.5 text-[11px] text-white/60">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-mint" />
                    اجماع {fa(usd.sourceCount)} منبع
                    {usd.confidence ? ` · اطمینان ${fa(Math.round(usd.confidence * 100))}٪` : ""}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-6 text-white/70">نرخ دلار هنوز دریافت نشده است.</p>
            )}

            {/* خانواده‌ی دلار: فردایی، هرات، تتر */}
            {dollarFamily.length ? (
              <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {dollarFamily.map((rate) => {
                  const gap = usd?.sell ? ((rate.sell - usd.sell) / usd.sell) * 100 : null;
                  return (
                    <button
                      key={rate.symbol}
                      type="button"
                      onClick={() => setSelected(rate)}
                      className="glass flex flex-col items-start gap-1 p-3.5 text-right transition-colors hover:bg-white/[.1]"
                    >
                      <span className="text-[11px] text-white/65">{rate.nameFa}</span>
                      <strong className="tabular text-[19px] font-bold tracking-[-.5px]">{fa(rate.sell)}</strong>
                      <span className="text-[10.5px] text-white/55">
                        {gap === null ? movement(rate.changePercent) : `${movement(gap)} نسبت به نقدی`}
                      </span>
                    </button>
                  );
                })}
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
                <PriceChart data={heroPoints} height={230} compactAxis={heroRange === "10y"} />
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
                مبدل ارز
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------- نوار نرخ‌ها ----------------------------- */}
      <section className="border-b border-line bg-surface">
        <div className="content-width table-scroll flex gap-2 py-3">
          {TICKER.map((symbol) => bySymbol.get(symbol))
            .filter(Boolean)
            .map((rate) => (
              <button
                key={rate!.symbol}
                type="button"
                onClick={() => setSelected(rate!)}
                className="flex shrink-0 items-center gap-2.5 rounded-xl border border-line bg-field px-3 py-2 text-right transition-colors hover:border-line-strong"
              >
                <RateIcon rate={rate!} />
                <span className="flex flex-col">
                  <small className="text-[10.5px] text-muted">{rate!.nameFa}</small>
                  <strong className="tabular text-[12.5px]">{formatPrice(rate!.sell)}</strong>
                </span>
                <span className={`text-[11px] font-bold ${rate!.changePercent >= 0 ? "text-green" : "text-danger"}`}>
                  {movement(rate!.changePercent)}
                </span>
              </button>
            ))}
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
              همه‌ی قیمت‌ها رایگان و قابل مشاهده است · روی هر ردیف بزنید تا نمودار و هشدار قیمت را ببینید
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
            {CATEGORY_TABS.map((tab) => (
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

        <div className="table-scroll mt-4 border-y border-line">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[minmax(210px,1.35fr)_repeat(3,minmax(110px,.75fr))_minmax(140px,.85fr)_32px] items-center gap-x-3.5 text-xxs font-semibold text-faint">
              <span className="py-3.5">دارایی</span>
              <span>قیمت خرید</span>
              <span>قیمت فروش</span>
              <span>تغییر روز</span>
              <span>منبع</span>
              <span />
            </div>

            {rows.length ? (
              rows.map((rate) => (
                <button
                  key={rate.symbol}
                  type="button"
                  onClick={() => setSelected(rate)}
                  className="grid w-full grid-cols-[minmax(210px,1.35fr)_repeat(3,minmax(110px,.75fr))_minmax(140px,.85fr)_32px] items-center gap-x-3.5 border-t border-line bg-surface py-4 text-right text-[12px] text-sub transition-colors hover:bg-hover"
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
                    {formatPrice(rate.buy)} <small className="text-muted">{unitLabel(rate.unit)}</small>
                  </span>
                  <span className="tabular">
                    <strong className="text-[13px] text-ink">{formatPrice(rate.sell)}</strong>{" "}
                    <small className="text-muted">{unitLabel(rate.unit)}</small>
                  </span>
                  <span className={`font-bold ${rate.changePercent >= 0 ? "text-green" : "text-danger"}`}>
                    {movement(rate.changePercent)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11.5px]">
                    <ConfidenceDot confidence={rate.confidence} />
                    {rate.sourceCount && rate.sourceCount > 1
                      ? `اجماع ${fa(rate.sourceCount)} منبع`
                      : rate.sourceLabel}
                  </span>
                  <ChevronLeft className="h-4 w-4 text-faint" />
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 border-t border-line py-16 text-center">
                <Search className="h-6 w-6 text-faint" />
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

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass px-3 py-2.5">
      <dt className="text-[10.5px] text-white/55">{label}</dt>
      <dd className="tabular mt-0.5 text-[14px] font-bold">{value}</dd>
    </div>
  );
}

/** رنگ نقطه از اطمینان موتور تحلیل: سبز، زرد یا خاکستری */
function ConfidenceDot({ confidence }: { confidence?: number }) {
  const tone =
    confidence === undefined || confidence === null
      ? "bg-faint"
      : confidence >= 0.7
        ? "bg-green-dot"
        : confidence >= 0.45
          ? "bg-amber"
          : "bg-faint";
  return (
    <i
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`}
      title={confidence ? `اطمینان ${Math.round(confidence * 100)}٪` : undefined}
    />
  );
}
