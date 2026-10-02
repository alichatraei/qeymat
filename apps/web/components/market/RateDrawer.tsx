"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChartLine, Repeat, X } from "lucide-react";
import { fa, movement, relatedSymbols, timeAgo, unitLabel } from "@qeymat/shared";
import RateIcon from "./RateIcon";
import PriceChart, { formatPrice } from "./PriceChart";
import AlertForm from "./AlertForm";
import AnalysisCard from "./AnalysisCard";
import type { HistorySeries, RateView } from "@/lib/types";

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
  const bySymbol = new Map(assets.map((asset) => [asset.symbol, asset]));
  const related = relatedSymbols(rate.symbol, assets)
    .map((symbol) => bySymbol.get(symbol))
    .filter((asset): asset is RateView => Boolean(asset));

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
      <aside ref={panel} className="absolute inset-y-0 right-0 flex w-[min(480px,100%)] animate-drawer-in flex-col overflow-y-auto bg-surface shadow-drawer">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-sub hover:bg-soft"
            aria-label="بستن"
          >
            <X className="h-[17px] w-[17px]" />
          </button>
          <span className="text-[12.5px] font-bold">جزئیات نرخ</span>
          <span className="h-9 w-9" />
        </div>

        <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="mt-5 flex items-center gap-3.5">
            <RateIcon rate={rate} size="large" />
            <div>
              <h2 className="text-[21px] font-bold tracking-[-.5px]">{rate.nameFa}</h2>
              <small dir="ltr" className="block text-right text-[11.5px] text-muted">
                {rate.symbol}
              </small>
            </div>
          </div>

          <div className="mt-6 flex items-end gap-2.5">
            <strong className="tabular text-[40px] font-extrabold leading-none tracking-[-1.8px]">
              {formatPrice(rate.sell)}
            </strong>
            <span className="pb-1 text-[13px] text-muted">{unit}</span>
          </div>
          <small
            className={`mt-2 block text-[12px] font-bold ${
              rate.changePercent >= 0 ? "text-green" : "text-danger"
            }`}
          >
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
                    <RateIcon rate={item} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{item.nameFa}</span>
                    <span className="text-left">
                      <strong className="tabular block text-[13.5px]">
                        {formatPrice(item.sell)} <small className="font-normal text-muted">{unitLabel(item.unit)}</small>
                      </strong>
                      <small className={`block text-[11px] font-bold ${item.changePercent >= 0 ? "text-green" : "text-danger"}`}>
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
            <Stat
              label="تغییر امروز"
              value={movement(rate.changePercent)}
              tone={rate.changePercent >= 0 ? "text-green" : "text-danger"}
            />
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

          <AlertForm rate={rate} />

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href={`/chart?symbol=${rate.symbol}`} className="btn-solid">
              <ChartLine />
              نمودار کامل
            </Link>
            <Link href={`/converter?symbol=${rate.symbol}`} className="btn-ghost">
              <Repeat />
              تبدیل ارز
            </Link>
          </div>
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
