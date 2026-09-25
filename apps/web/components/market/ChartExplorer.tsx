"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Bell, GitCompareArrows, Plus, Search, X } from "lucide-react";
import {
  CATEGORY_TABS,
  CHART_INTERVALS,
  CHART_RANGES,
  movement,
  unitLabel,
} from "@qeymat/shared";
import RateIcon from "./RateIcon";
import PriceChart, { CompareChart, formatPrice } from "./PriceChart";
import AnalysisCard from "./AnalysisCard";
import AlertForm from "./AlertForm";
import type { HistorySeries, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

/**
 * صفحه‌ی نمودار: یک دارایی با بازه‌ی ۱ روز تا ۱۰ سال و دانه‌بندی روزانه،
 * ماهانه و سالانه (شمسی). با افزودن تا سه دارایی دیگر، حالت مقایسه فعال
 * می‌شود؛ مقایسه به‌صورت پیش‌فرض درصدی است تا دلار و سکه کنار هم معنا داشته باشند.
 */
export default function ChartExplorer({
  assets,
  initialSymbol,
  initialCompare = [],
  initialRange,
  initialInterval,
}: {
  assets: RateView[];
  initialSymbol: string;
  initialCompare?: string[];
  initialRange?: string;
  initialInterval?: string;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [compare, setCompare] = useState<string[]>(initialCompare);
  const [range, setRange] = useState(
    CHART_RANGES.some((item) => item.id === initialRange) ? initialRange! : "1y",
  );
  const [interval, setChartInterval] = useState<string | null>(
    CHART_INTERVALS.some((item) => item.id === initialInterval) ? initialInterval! : null,
  );
  const [mode, setMode] = useState<"percent" | "absolute">("percent");
  const [picker, setPicker] = useState<"main" | "compare" | null>(null);

  const bySymbol = useMemo(() => new Map(assets.map((asset) => [asset.symbol, asset])), [assets]);
  const rate = bySymbol.get(symbol) ?? assets[0];
  const rangeSpec = CHART_RANGES.find((item) => item.id === range)!;
  const effectiveInterval = range === "1d" ? "raw" : interval ?? rangeSpec.interval;
  const comparing = compare.length > 0;

  // آدرس صفحه با انتخاب‌ها همگام می‌ماند تا قابل اشتراک‌گذاری باشد
  useEffect(() => {
    const params = new URLSearchParams({ symbol, range });
    if (interval) params.set("interval", interval);
    if (compare.length) params.set("compare", compare.join(","));
    window.history.replaceState(null, "", `/chart?${params}`);
  }, [symbol, range, interval, compare]);

  const intervalQuery = effectiveInterval === "raw" ? "" : `&interval=${effectiveInterval}`;
  const { data: single, isLoading } = useSWR<{ series: HistorySeries }>(
    comparing ? null : `/api/public/history?symbol=${symbol}&range=${range}${intervalQuery}`,
    fetcher,
    { keepPreviousData: true },
  );
  const { data: multi, isLoading: multiLoading } = useSWR<{ series: HistorySeries[] }>(
    comparing ? `/api/public/compare?symbols=${[symbol, ...compare].join(",")}&range=${range}${intervalQuery}` : null,
    fetcher,
    { keepPreviousData: true },
  );

  const series = single?.series;
  const points = series?.points ?? [];
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const periodChange = first && last ? ((last - first) / first) * 100 : null;
  const high = points.length ? Math.max(...points.map((point) => point.high ?? point.value)) : null;
  const low = points.length ? Math.min(...points.map((point) => point.low ?? point.value)) : null;
  const years = rangeSpec.days / 365;
  const cagr =
    first && last && years >= 1 && series && series.yearsAvailable >= 1
      ? (Math.pow(last / first, 1 / Math.min(years, series.yearsAvailable)) - 1) * 100
      : null;

  const selectAsset = (next: string) => {
    if (picker === "compare") {
      if (next !== symbol && !compare.includes(next)) setCompare([...compare, next].slice(0, 3));
    } else {
      setSymbol(next);
      setCompare(compare.filter((item) => item !== next));
    }
    setPicker(null);
  };

  return (
    <main className="pb-20 pt-8">
      <div className="content-width">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-.8px]">نمودار و مقایسه</h1>
            <p className="mt-1 text-[12px] text-muted">
              روزانه، ماهانه و سالانه — تا ۱۰ سال، یا تا جایی که تاریخچه‌ی هر دارایی موجود است.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card min-w-0 p-4 shadow-card sm:p-6">
            {/* انتخاب دارایی و مقایسه */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPicker("main")}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-field py-1.5 pl-3 pr-1.5 transition-colors hover:border-line-strong"
              >
                <RateIcon rate={rate} size="small" />
                <span className="text-[13px] font-bold">{rate.nameFa}</span>
                <Search className="h-3.5 w-3.5 text-faint" />
              </button>

              {compare.map((item, index) => {
                const other = bySymbol.get(item);
                if (!other) return null;
                return (
                  <span
                    key={item}
                    className="flex items-center gap-2 rounded-xl border border-line bg-field py-1.5 pl-1.5 pr-3 text-[12px] font-semibold"
                  >
                    <i className={`h-2 w-2 rounded-full ${["bg-blue", "bg-amber", "bg-purple"][index]}`} />
                    {other.nameFa}
                    <button
                      type="button"
                      onClick={() => setCompare(compare.filter((value) => value !== item))}
                      className="grid h-6 w-6 place-items-center rounded-lg text-faint hover:bg-tab hover:text-ink"
                      aria-label={`حذف ${other.nameFa} از مقایسه`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                );
              })}

              {compare.length < 3 ? (
                <button
                  type="button"
                  onClick={() => setPicker("compare")}
                  className="flex h-[42px] items-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3 text-[12px] font-semibold text-sub hover:text-ink"
                >
                  {comparing ? <Plus className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
                  {comparing ? "افزودن" : "مقایسه با …"}
                </button>
              ) : null}
            </div>

            {/* قیمت و آمار بازه */}
            {!comparing ? (
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex items-end gap-2">
                    <strong className="tabular text-[clamp(30px,4vw,42px)] font-extrabold leading-none tracking-[-1.6px]">
                      {formatPrice(rate.sell)}
                    </strong>
                    <span className="pb-1 text-[13px] text-muted">{unitLabel(rate.unit)}</span>
                  </div>
                  <small className={`mt-1.5 block text-[12px] font-bold ${rate.changePercent >= 0 ? "text-green" : "text-danger"}`}>
                    {movement(rate.changePercent)} امروز
                  </small>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5px] sm:grid-cols-4">
                  <PeriodStat label="تغییر بازه" value={periodChange === null ? "—" : movement(periodChange)} tone={periodChange} />
                  <PeriodStat label="بیشترین" value={high ? formatPrice(high) : "—"} />
                  <PeriodStat label="کمترین" value={low ? formatPrice(low) : "—"} />
                  <PeriodStat label="رشد سالانه" value={cagr === null ? "—" : movement(cagr)} tone={cagr} />
                </dl>
              </div>
            ) : null}

            {/* بازه و دانه‌بندی */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="table-scroll max-w-full">
                <div className="segmented">
                  {CHART_RANGES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-active={range === item.id}
                      onClick={() => {
                        setRange(item.id);
                        setChartInterval(null);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {range !== "1d" ? (
                  <div className="segmented">
                    {CHART_INTERVALS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-active={effectiveInterval === item.id}
                        onClick={() => setChartInterval(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {comparing ? (
                  <div className="segmented">
                    <button type="button" data-active={mode === "percent"} onClick={() => setMode("percent")}>
                      درصد تغییر
                    </button>
                    <button type="button" data-active={mode === "absolute"} onClick={() => setMode("absolute")}>
                      قیمت
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {comparing ? (
              multiLoading && !multi ? (
                <div className="mt-5 h-[380px] animate-pulse rounded-2xl bg-soft" />
              ) : (
                <>
                  <CompareChart series={multi?.series ?? []} mode={mode} height={380} />
                  <CompareTable series={multi?.series ?? []} />
                </>
              )
            ) : isLoading && !series ? (
              <div className="mt-5 h-[380px] animate-pulse rounded-2xl bg-soft" />
            ) : (
              <PriceChart
                data={points}
                height={380}
                unit={unitLabel(rate.unit)}
                compactAxis={rangeSpec.days > 366}
              />
            )}

            {!comparing && series && series.firstDay && rangeSpec.days > 366 && series.yearsAvailable < years - 0.2 ? (
              <p className="mt-3 text-[11px] text-muted">
                تاریخچه‌ی {rate.nameFa} از {new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).format(new Date(series.firstDay))}{" "}
                در دسترس است؛ نمودار از همان‌جا شروع می‌شود.
              </p>
            ) : null}
          </section>

          <aside className="min-w-0 space-y-0">
            <AnalysisCard symbol={symbol} />
            <AlertForm key={symbol} rate={rate} />
            <p className="mt-4 flex items-center gap-1.5 text-[10.5px] text-muted">
              <Bell className="h-3.5 w-3.5" />
              هشدارهای ثبت‌شده را در پنل کاربری مدیریت کنید.
            </p>
          </aside>
        </div>
      </div>

      {picker ? (
        <AssetPicker
          assets={assets}
          exclude={picker === "compare" ? [symbol, ...compare] : []}
          title={picker === "compare" ? "افزودن به مقایسه" : "انتخاب دارایی"}
          onSelect={selectAsset}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </main>
  );
}

function PeriodStat({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  return (
    <div>
      <dt className="text-[10.5px] text-muted">{label}</dt>
      <dd
        className={`tabular font-bold ${
          tone === undefined || tone === null ? "text-ink" : tone >= 0 ? "text-green" : "text-danger"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function CompareTable({ series }: { series: HistorySeries[] }) {
  if (!series.length) return null;
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      {series.map((item, index) => {
        const first = item.points[0]?.value;
        const last = item.points[item.points.length - 1]?.value;
        const change = first && last ? ((last - first) / first) * 100 : null;
        return (
          <div key={item.symbol} className="flex items-center justify-between rounded-xl border border-line bg-field px-3 py-2.5">
            <span className="flex items-center gap-2 text-[12px] font-semibold">
              <i className={`h-2.5 w-2.5 rounded-full ${["bg-green", "bg-blue", "bg-amber", "bg-purple"][index]}`} />
              {item.nameFa}
            </span>
            <span className="flex items-center gap-3 text-[11.5px]">
              <span className="tabular text-muted">{last ? formatPrice(last) : "—"}</span>
              <strong className={change === null ? "text-faint" : change >= 0 ? "text-green" : "text-danger"}>
                {change === null ? "—" : movement(change)}
              </strong>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AssetPicker({
  assets,
  exclude,
  title,
  onSelect,
  onClose,
}: {
  assets: RateView[];
  exclude: string[];
  title: string;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("ALL");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = assets.filter((asset) => {
    if (exclude.includes(asset.symbol)) return false;
    if (category !== "ALL" && asset.category !== category) return false;
    const query = term.trim().toLowerCase();
    return query ? `${asset.nameFa} ${asset.symbol} ${asset.nameEn}`.toLowerCase().includes(query) : true;
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 animate-fade-in bg-overlay/40" onClick={onClose} aria-label="بستن" />
      <div className="card relative flex max-h-[80vh] w-[min(520px,100%)] animate-rise-in flex-col shadow-drawer">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <strong className="text-[13px]">{title}</strong>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-sub hover:bg-tab" aria-label="بستن">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-line p-3">
          <input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="جست‌وجوی نام یا نماد"
            className="field"
          />
          <div className="table-scroll mt-2">
            <div className="segmented">
              <button type="button" data-active={category === "ALL"} onClick={() => setCategory("ALL")}>
                همه
              </button>
              {CATEGORY_TABS.map((tab) => (
                <button key={tab.id} type="button" data-active={category === tab.id} onClick={() => setCategory(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-y-auto p-2">
          {list.map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelect(asset.symbol)}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-hover"
            >
              <RateIcon rate={asset} size="small" />
              <span className="flex flex-1 flex-col">
                <strong className="text-[12.5px]">{asset.nameFa}</strong>
                <small dir="ltr" className="text-right text-[10.5px] text-muted">
                  {asset.symbol}
                </small>
              </span>
              <span className="tabular text-[12px] text-sub">{formatPrice(asset.sell)}</span>
            </button>
          ))}
          {!list.length ? <p className="py-10 text-center text-[12px] text-muted">موردی پیدا نشد.</p> : null}
        </div>
      </div>
    </div>
  );
}

