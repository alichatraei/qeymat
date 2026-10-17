"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BellPlus, ChartLine, ChevronDown, Share2 } from "lucide-react";
import { fa, movement, relatedSymbols, timeAgo, unitLabel } from "@qeymat/shared";
import AssetIcon from "./AssetIcon";
import PriceChart, { formatPrice } from "./PriceChart";
import AlertForm from "./AlertForm";
import AnalysisCard from "./AnalysisCard";
import { DIR_ARROW, DIR_CLASS, directionOf } from "./marketFormat";
import type { HistorySeries, RateView } from "@/lib/types";

/** سه نرخ دلار که در جزئیات با سوییچ کنار هم‌اند */
const USD_VARIANTS = [
  { symbol: "USD", label: "نقدی" },
  { symbol: "USD_FARDA", label: "فردایی" },
  { symbol: "USD_HERAT", label: "هرات" },
];

const RANGES = [
  { id: "1d", label: "روز" },
  { id: "1w", label: "هفته" },
  { id: "1m", label: "ماه" },
  { id: "1y", label: "سال" },
  { id: "5y", label: "۵ سال" },
  { id: "10y", label: "۱۰ سال" },
];

const fetcher = (url: string) => fetch(url).then((response) => response.json());

export default function RateDrawer({
  rate,
  assets = [],
  onOpen,
  onClose,
}: {
  rate: RateView;
  /** همه‌ی نرخ‌ها، برای «نرخ‌های مرتبط» */
  assets?: RateView[];
  onOpen?: (rate: RateView) => void;
  onClose: () => void;
}) {
  const [range, setRange] = useState("1w");
  const panel = useRef<HTMLElement>(null);
  const alerts = useRef<HTMLDivElement>(null);
  const bySymbol = new Map(assets.map((asset) => [asset.symbol, asset]));
  const direction = directionOf(rate.changePercent);
  const dirClass = DIR_CLASS[direction];
  // سوییچ نقدی/فردایی/هرات فقط برای خانوادهٔ دلار، وقتی هر سه نرخ موجودند
  const usdVariants = USD_VARIANTS.filter((variant) => bySymbol.has(variant.symbol));
  const showVariants = usdVariants.length > 1 && usdVariants.some((variant) => variant.symbol === rate.symbol);
  const related = relatedSymbols(rate.symbol, assets)
    .map((symbol) => bySymbol.get(symbol))
    .filter((asset): asset is RateView => Boolean(asset));

  const share = async () => {
    const url = `${window.location.origin}/?symbol=${rate.symbol}`;
    const text = `${rate.nameFa}: ${formatPrice(rate.sell)} ${unitLabel(rate.unit)} (${movement(rate.changePercent)})`;
    try {
      if (navigator.share) await navigator.share({ title: "قیمت", text, url });
      else await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch {
      /* لغو توسط کاربر */
    }
  };

  // با رفتن به یک نرخ مرتبط، از بالای جزئیات شروع شود
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [rate.symbol]);
  const { data, isLoading } = useSWR<{ series: HistorySeries }>(
    `/api/public/history?symbol=${rate.symbol}&range=${range}`,
    fetcher,
    { keepPreviousData: true },
  );
  const series = data?.series;
  const unit = unitLabel(rate.unit);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`جزئیات ${rate.nameFa}`}>
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-overlay/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="بستن"
      />
      <aside
        ref={panel}
        className="absolute inset-x-0 bottom-0 top-11 flex animate-rise-in flex-col overflow-hidden rounded-t-[24px] bg-surface shadow-drawer md:inset-y-0 md:left-auto md:right-0 md:w-[min(440px,100%)] md:animate-drawer-in md:rounded-none"
      >
        {/* دستگیرهٔ شیت در موبایل */}
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong md:hidden" aria-hidden="true" />
        <div className="flex h-12 shrink-0 items-center gap-1 px-2">
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-[10px] text-sub hover:bg-soft"
            aria-label="بستن"
          >
            <ChevronDown className="h-[22px] w-[22px] md:hidden" />
            <svg className="hidden h-[18px] w-[18px] md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <span className="flex-1" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <div className="flex items-center gap-3">
            <AssetIcon rate={rate} size={56} />
            <div>
              <h2 className="text-[20px] font-extrabold tracking-[-.5px]">{rate.nameFa}</h2>
              <small dir="ltr" className="block text-right font-mono text-[11px] tracking-[.02em] text-muted">
                {rate.symbol}
              </small>
            </div>
          </div>

          {showVariants && onOpen ? (
            <div className="segmented mt-4 w-full grid-cols-3" role="radiogroup" aria-label="نوع نرخ">
              {usdVariants.map((variant) => (
                <button
                  key={variant.symbol}
                  type="button"
                  role="radio"
                  aria-checked={variant.symbol === rate.symbol}
                  data-active={variant.symbol === rate.symbol}
                  onClick={() => onOpen(bySymbol.get(variant.symbol)!)}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex items-end gap-2.5">
            <strong className={`tabular text-[40px] font-bold leading-none tracking-[-1.2px] ${dirClass}`}>
              {formatPrice(rate.sell)}
            </strong>
            <span className="pb-1 text-[13px] text-muted">{unit}</span>
          </div>
          <small className={`mt-2 flex items-center gap-1.5 text-[13px] font-medium ${dirClass}`}>
            <i className="text-[9px] not-italic" aria-hidden="true">{DIR_ARROW[direction]}</i>
            {movement(rate.changePercent)} نسبت به دیروز
          </small>

          <div className="segmented mt-5 w-full grid-cols-6">
            {RANGES.map((item) => (
              <button key={item.id} type="button" data-active={range === item.id} onClick={() => setRange(item.id)}>
                {item.label}
              </button>
            ))}
          </div>

          {isLoading && !series ? (
            <div className="mt-5 h-[230px] animate-pulse rounded-2xl bg-soft" />
          ) : (
            <PriceChart
              data={series?.points ?? []}
              height={230}
              unit={unit}
              compactAxis={range === "10y" || range === "5y"}
              interval={series?.interval ?? "day"}
            />
          )}
          {series && series.yearsAvailable > 0 && ["5y", "10y"].includes(range) && series.yearsAvailable < (range === "5y" ? 5 : 10) ? (
            <p className="mt-2 text-[10.5px] text-muted">
              تاریخچه‌ی این دارایی از {fa(Math.floor(series.yearsAvailable))} سال پیش موجود است.
            </p>
          ) : null}

          {related.length > 0 && onOpen ? (
            <section className="mt-6">
              <h3 className="mb-2.5 text-[13px] font-bold">نرخ‌های مرتبط</h3>
              <div className="overflow-hidden rounded-2xl border border-line">
                {related.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => onOpen(item)}
                    className="flex w-full items-center gap-3 border-b border-line px-3.5 py-3 text-right last:border-b-0 hover:bg-soft"
                  >
                    <AssetIcon rate={item} size={32} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{item.nameFa}</span>
                    <span className="text-left">
                      <strong className={`tabular block text-[13.5px] ${DIR_CLASS[directionOf(item.changePercent)]}`}>
                        {formatPrice(item.sell)} <small className="font-normal text-muted">{unitLabel(item.unit)}</small>
                      </strong>
                      <small className={`block text-[11px] font-medium ${DIR_CLASS[directionOf(item.changePercent)]}`}>
                        {movement(item.changePercent)}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stat label="قیمت خرید" value={formatPrice(rate.buy)} />
            <Stat label="قیمت فروش" value={formatPrice(rate.sell)} />
            <Stat label="کمترین امروز" value={rate.dayLow ? formatPrice(rate.dayLow) : "—"} />
            <Stat label="بیشترین امروز" value={rate.dayHigh ? formatPrice(rate.dayHigh) : "—"} />
            <Stat label="تغییر امروز" value={movement(rate.changePercent)} tone={dirClass} />
            <Stat label="آخرین به‌روزرسانی" value={timeAgo(rate.fetchedAt)} />
            {rate.globalPrice ? (
              // نفت، فلزات و سهام به دلار؛ رمزارز به تتر
              <Stat
                label="قیمت جهانی"
                value={`${formatPrice(rate.globalPrice)} ${rate.category === "CRYPTO" ? "تتر" : "دلار"}`}
              />
            ) : null}
          </div>

          <AnalysisCard symbol={rate.symbol} compact />

          <div ref={alerts}>
            <AlertForm rate={rate} />
          </div>
        </div>

        {/* نوار اکشن دیزاین: یک دکمهٔ پررنگ + دو مربع آیکنی */}
        <div className="flex shrink-0 items-stretch gap-3 border-t border-line bg-surface px-4 pb-[calc(.875rem+env(safe-area-inset-bottom))] pt-3.5">
          <button
            type="button"
            onClick={() => alerts.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-[10px] bg-brand text-[15px] font-bold text-brand-cream transition-transform active:scale-[.97] dark:bg-brand-mint dark:text-brand-deep"
          >
            <BellPlus className="h-5 w-5" />
            ساخت هشدار
          </button>
          <Link
            href={`/chart?symbol=${rate.symbol}`}
            aria-label="نمودار کامل"
            className="grid h-[52px] w-[52px] place-items-center rounded-[10px] border border-line-strong bg-surface text-ink transition-transform active:scale-[.97]"
          >
            <ChartLine className="h-[21px] w-[21px]" />
          </Link>
          <button
            type="button"
            onClick={share}
            aria-label="اشتراک‌گذاری"
            className="grid h-[52px] w-[52px] place-items-center rounded-[10px] border border-line-strong bg-surface text-ink transition-transform active:scale-[.97]"
          >
            <Share2 className="h-[21px] w-[21px]" />
          </button>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-field p-3.5">
      <span className="block text-2xs text-muted">{label}</span>
      <strong className={`tabular mt-1.5 block text-[13px] ${tone}`}>{value}</strong>
    </div>
  );
}
