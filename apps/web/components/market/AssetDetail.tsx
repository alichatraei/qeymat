"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BellPlus, ChevronDown, Share2, Star } from "lucide-react";
import { fa, relatedSymbols, timeAgo, unitLabel } from "@qeymat/shared";
import AssetIcon from "./AssetIcon";
import AlertForm from "./AlertForm";
import AnalysisCard from "./AnalysisCard";
import PriceChart, { formatPrice } from "./PriceChart";
import { DIR_ARROW, DIR_CLASS, directionOf, marketChange } from "./marketFormat";
import type { HistoryPoint, HistorySeries, MarketSnapshot, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

const RANGES = [
  { id: "1d", label: "۱ روز", short: "۱ر" },
  { id: "1w", label: "۱ هفته", short: "۱ه" },
  { id: "1m", label: "۱ ماه", short: "۱م" },
  { id: "1y", label: "۱ سال", short: "۱س" },
  { id: "5y", label: "۵ سال", short: "۵س" },
  { id: "10y", label: "۱۰ سال", short: "۱۰س" },
];

const USD_VARIANTS = [
  { symbol: "USD", label: "نقدی" },
  { symbol: "USD_FARDA", label: "فردایی" },
  { symbol: "USD_HERAT", label: "هرات" },
];

const PICKS_ORDER_KEY = "qeymat.market.order";

/** کمترین و بیشترین یک بازهٔ زمانی از نقاط سری یک‌ساله */
function rangeStat(points: HistoryPoint[], days: number): string {
  const since = Date.now() - days * 86_400_000;
  const slice = points.filter((point) => new Date(point.at).getTime() >= since);
  if (!slice.length) return "—";
  const lows = slice.map((point) => point.low ?? point.value);
  const highs = slice.map((point) => point.high ?? point.value);
  return `${formatPrice(Math.min(...lows))} – ${formatPrice(Math.max(...highs))}`;
}

export default function AssetDetail({
  symbol,
  initialSnapshot,
  initialSeries,
  faqs,
}: {
  symbol: string;
  initialSnapshot: MarketSnapshot;
  initialSeries: HistorySeries | null;
  faqs: { q: string; a: string }[];
}) {
  const [variant, setVariant] = useState(symbol);
  const [range, setRange] = useState("1w");
  const alerts = useRef<HTMLDivElement>(null);
  const [starred, setStarred] = useState<boolean | null>(null);

  const { data } = useSWR<MarketSnapshot>("/api/public/rates", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 30000,
  });
  const snapshot = data ?? initialSnapshot;
  const bySymbol = useMemo(() => new Map(snapshot.assets.map((asset) => [asset.symbol, asset])), [snapshot.assets]);

  const isUsdFamily = USD_VARIANTS.some((item) => item.symbol === symbol);
  const usdVariants = isUsdFamily ? USD_VARIANTS.filter((item) => bySymbol.has(item.symbol)) : [];
  const active = bySymbol.get(variant) ?? bySymbol.get(symbol);

  const { data: seriesData, isLoading: chartLoading } = useSWR<{ series: HistorySeries }>(
    active ? `/api/public/history?symbol=${active.symbol}&range=${range}` : null,
    fetcher,
    { keepPreviousData: true, fallbackData: range === "1w" && variant === symbol && initialSeries ? { series: initialSeries } : undefined },
  );
  const { data: yearData } = useSWR<{ series: HistorySeries }>(
    active ? `/api/public/history?symbol=${active.symbol}&range=1y` : null,
    fetcher,
  );

  if (!active) return null;

  const series = seriesData?.series;
  const yearPoints = yearData?.series?.points ?? [];
  const direction = directionOf(active.changePercent);
  const dirClass = DIR_CLASS[direction];
  const unit = unitLabel(active.unit);
  const related = relatedSymbols(symbol, snapshot.assets)
    .map((item) => bySymbol.get(item))
    .filter((item): item is RateView => Boolean(item) && item!.symbol !== active.symbol)
    .slice(0, 4);

  const changeAbs = Math.abs((active.sell * active.changePercent) / 100);

  /** ستارهٔ «در منتخب»: به ترتیب ذخیره‌شدهٔ صفحهٔ بازار اضافه/کم می‌شود */
  const readPicks = (): string[] => {
    try {
      const orders = JSON.parse(window.localStorage.getItem(PICKS_ORDER_KEY) || "{}");
      return Array.isArray(orders.PICKS) ? orders.PICKS : [];
    } catch {
      return [];
    }
  };
  const inPicks = starred ?? (typeof window !== "undefined" && readPicks().includes(symbol));
  const toggleStar = () => {
    try {
      const orders = JSON.parse(window.localStorage.getItem(PICKS_ORDER_KEY) || "{}");
      const picks: string[] = Array.isArray(orders.PICKS) ? orders.PICKS : [];
      const next = picks.includes(symbol) ? picks.filter((item) => item !== symbol) : [...picks, symbol];
      window.localStorage.setItem(PICKS_ORDER_KEY, JSON.stringify({ ...orders, PICKS: next }));
      setStarred(next.includes(symbol));
    } catch {
      /* — */
    }
  };

  const share = async () => {
    const url = window.location.href;
    const text = `${active.nameFa}: ${formatPrice(active.sell)} ${unit}`;
    try {
      if (navigator.share) await navigator.share({ title: "قیمت", text, url });
      else await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch {
      /* لغو توسط کاربر */
    }
  };

  const scrollToAlert = () => alerts.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <main className="content-width pb-28 pt-5 xl:pb-16">
      {/* ------------------------------ سرصفحه ------------------------------ */}
      <nav aria-label="مسیر" className="flex items-center gap-1.5 text-[12px] text-muted">
        <Link href="/" className="hover:text-ink">بازار</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/?category=${active.category}`} className="hover:text-ink">{categoryLabel(active.category)}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-sub">{active.nameFa}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3.5">
        <AssetIcon rate={active} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[23px] font-extrabold tracking-[-.5px] sm:text-[27px]">قیمت {bySymbol.get(symbol)?.nameFa ?? active.nameFa} امروز</h1>
          <p className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
            <span dir="ltr" className="font-mono tracking-[.02em]">{active.symbol}</span>
            · به {unit}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleStar}
            aria-pressed={Boolean(inPicks)}
            className={`inline-flex h-11 items-center gap-1.5 rounded-control border px-3 text-[12px] font-bold transition-colors ${
              inPicks ? "border-amber/50 bg-amber-soft text-amber-ink" : "border-line bg-surface text-sub hover:text-ink"
            }`}
          >
            <Star className="h-4 w-4" fill={inPicks ? "currentColor" : "none"} />
            {inPicks ? "در منتخب" : "افزودن به منتخب"}
          </button>
          <button
            type="button"
            onClick={share}
            aria-label="اشتراک‌گذاری"
            className="grid h-11 w-11 place-items-center rounded-control border border-line bg-surface text-sub hover:text-ink"
          >
            <Share2 className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={scrollToAlert}
            className="hidden h-11 items-center gap-2 rounded-control bg-brand px-4 text-[13px] font-bold text-brand-cream transition-transform active:scale-[.97] sm:inline-flex dark:bg-brand-mint dark:text-brand-deep"
          >
            <BellPlus className="h-[18px] w-[18px]" />
            ساخت هشدار
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* --------------------------- ستون اصلی --------------------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <section className="card p-5">
            {usdVariants.length > 1 ? (
              <div className="segmented mb-5 w-full max-w-[360px] grid-cols-3" role="radiogroup" aria-label="نوع نرخ">
                {usdVariants.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    role="radio"
                    aria-checked={variant === item.symbol}
                    data-active={variant === item.symbol}
                    onClick={() => setVariant(item.symbol)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-end gap-3">
              <strong className={`tabular text-[clamp(34px,5vw,56px)] font-bold leading-none tracking-[-1.5px] ${dirClass}`}>
                {formatPrice(active.sell)}
              </strong>
              <span className="pb-1.5 text-[14px] text-muted">{unit}</span>
            </div>
            <p className={`mt-2.5 flex items-center gap-1.5 text-[14px] font-medium ${dirClass}`}>
              <i className="text-[9px] not-italic" aria-hidden="true">{DIR_ARROW[direction]}</i>
              {fa(Math.round(changeAbs))}
              {active.changePercent >= 0 ? "+" : "−"} ({marketChange(active.changePercent)}) · امروز
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted" suppressHydrationWarning>
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-green-dot" aria-hidden="true" />
              زنده · {timeAgo(active.fetchedAt)} · نرخ تحلیلی قیمت
            </p>

            <div className="mt-5">
              {chartLoading && !series ? (
                <div className="h-[300px] animate-pulse rounded-2xl bg-soft" />
              ) : series?.points?.length ? (
                <PriceChart
                  data={series.points}
                  height={300}
                  unit={unit}
                  compactAxis={range === "10y" || range === "5y"}
                  interval={series.interval ?? "day"}
                />
              ) : (
                <div className="flex h-[300px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-center">
                  <strong className="text-[13px]">نمودار این بازه در دسترس نیست</strong>
                  <span className="text-[11.5px] text-muted">بازهٔ دیگری را امتحان کنید.</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex justify-between border-t border-line" role="radiogroup" aria-label="بازه">
              {RANGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={range === item.id}
                  onClick={() => setRange(item.id)}
                  className={`-mt-px min-h-[44px] border-t-2 px-2 text-[13px] font-bold transition-colors sm:px-3 ${
                    range === item.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-sub"
                  }`}
                >
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ------------------------ دارایی‌های مرتبط ------------------------ */}
          {related.length ? (
            <section>
              <h2 className="mb-3 text-[16px] font-extrabold">دارایی‌های مرتبط</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {related.map((item) => {
                  const itemDir = directionOf(item.changePercent);
                  return (
                    <Link
                      key={item.symbol}
                      href={`/${item.symbol.toLowerCase()}`}
                      className="card flex flex-col gap-2.5 p-3.5 no-underline transition-colors hover:border-line-strong"
                    >
                      <AssetIcon rate={item} size={36} />
                      <span className="truncate text-[12.5px] font-medium text-sub">{item.nameFa}</span>
                      <span className={`tabular text-[15px] font-bold ${DIR_CLASS[itemDir]}`}>{formatPrice(item.sell)}</span>
                      <span className={`flex items-center gap-1 text-[11px] font-medium ${DIR_CLASS[itemDir]}`}>
                        <i className="text-[8px] not-italic" aria-hidden="true">{DIR_ARROW[itemDir]}</i>
                        {marketChange(item.changePercent)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* ------------------------------ FAQ ------------------------------ */}
          <section>
            <h2 className="mb-2 text-[16px] font-extrabold">پرسش‌های پرتکرار</h2>
            <div className="card divide-y divide-line px-4">
              {faqs.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 text-[13.5px] font-bold [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{item.q}</span>
                    <ChevronDown className="h-[18px] w-[18px] shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 text-[13px] leading-7 text-sub">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* --------------------------- ستون کناری --------------------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <section className="card p-5">
            <h2 className="text-[14px] font-extrabold">کمترین و بیشترین</h2>
            <dl className="mt-3 divide-y divide-line">
              {[
                ["امروز", active.dayLow && active.dayHigh ? `${formatPrice(active.dayLow)} – ${formatPrice(active.dayHigh)}` : "—"],
                ["هفته", rangeStat(yearPoints, 7)],
                ["ماه", rangeStat(yearPoints, 31)],
                ["۵۲ هفته", rangeStat(yearPoints, 364)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-[12px] text-muted">{label}</dt>
                  <dd className="tabular text-[13px] font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div ref={alerts}>
            <AlertForm rate={active} />
          </div>

          <AnalysisCard symbol={active.symbol} compact />

          <section className="card p-5">
            <h2 className="text-[14px] font-extrabold">منبع و زمان</h2>
            <p className="mt-2 text-[12.5px] font-bold">نرخ تحلیلی قیمت</p>
            <p className="mt-1 text-[11.5px] leading-6 text-muted" suppressHydrationWarning>
              آخرین به‌روزرسانی: {new Date(active.fetchedAt).toLocaleString("fa-IR", { dateStyle: "full", timeStyle: "medium", timeZone: "Asia/Tehran" })} (تهران)
            </p>
            <p className="mt-2 text-[11px] leading-6 text-muted">قیمت‌ها صرفاً جهت اطلاع‌رسانی هستند و توصیه به خرید یا فروش نیستند.</p>
          </section>
        </div>
      </div>

      {/* دکمهٔ هشدار چسبان موبایل، بالای تب‌بار */}
      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 px-4 py-2.5 backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={scrollToAlert}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[14px] font-bold text-brand-cream active:scale-[.98] dark:bg-brand-mint dark:text-brand-deep"
        >
          <BellPlus className="h-[18px] w-[18px]" />
          ساخت هشدار
        </button>
      </div>
    </main>
  );
}

function categoryLabel(category: string): string {
  switch (category) {
    case "CURRENCY":
      return "ارز";
    case "GOLD":
      return "طلا و سکه";
    case "CRYPTO":
      return "رمزارز";
    case "COMMODITY":
      return "کالا و انرژی";
    case "STOCK":
      return "سهام جهانی";
    default:
      return "شاخص‌ها";
  }
}
