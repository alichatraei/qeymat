"use client";

import Link from "next/link";
import useSWR from "swr";
import { Crown, Lock, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { fa, timeAgo } from "@qeymat/shared";
import { formatPrice } from "./PriceChart";
import type { Analysis } from "@/lib/analysis";

type Response = { analysis: Analysis } | { error: { code: string; message: string } };

const fetcher = (url: string) => fetch(url).then((response) => response.json());

const OUTLOOK = {
  bullish: { label: "صعودی", icon: TrendingUp, tone: "text-green bg-green-soft" },
  bearish: { label: "نزولی", icon: TrendingDown, tone: "text-danger bg-danger-soft" },
  neutral: { label: "خنثی", icon: Minus, tone: "text-amber-ink bg-amber-soft" },
} as const;

function percent(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : "−"}٪${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(Math.abs(value))}`;
}

/**
 * کارت تحلیل قیمت. برای کاربر بدون اشتراک یک پیش‌نمایش قفل‌شده نشان
 * می‌دهد تا بداند با قیمت پلاس چه چیزی می‌گیرد.
 */
export default function AnalysisCard({ symbol, compact = false }: { symbol: string; compact?: boolean }) {
  const { data, isLoading } = useSWR<Response>(`/api/plus/analysis?symbol=${symbol}`, fetcher, {
    refreshInterval: 120000,
  });

  if (isLoading || !data) {
    return <div className="mt-6 h-[140px] animate-pulse rounded-card bg-soft" />;
  }

  if ("error" in data) {
    return (
      <div className="relative mt-6 min-h-[150px] overflow-hidden rounded-card border border-amber-line bg-amber-soft/40 p-4">
        <div className="pointer-events-none select-none blur-[3px]" aria-hidden="true">
          <div className="flex items-center justify-between">
            <strong className="text-[13px]">تحلیل قیمت</strong>
            <span className="chip bg-green-soft text-green">صعودی</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <span>RSI ۵۸</span>
            <span>میانگین ۵۰ روزه</span>
            <span>حمایت و مقاومت</span>
          </div>
        </div>
        <div className="absolute inset-0 grid place-items-center bg-surface/40 p-4 text-center">
          <div>
            <p className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-amber-ink">
              <Lock className="h-4 w-4" />
              تحلیل قیمت مخصوص مشترکان پلاس
            </p>
            <Link href="/plus" className="btn-brand mt-3 h-9 min-h-0 !px-4 text-[11.5px]">
              <Crown />
              دیدن پلن‌ها
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { analysis } = data;
  const outlook = OUTLOOK[analysis.outlook];
  const Icon = outlook.icon;
  const ind = analysis.indicators;

  return (
    <div className="mt-6 rounded-card border border-line bg-field p-4">
      <div className="flex items-center justify-between gap-3">
        <strong className="flex items-center gap-1.5 text-[13px]">
          <Sparkles className="h-4 w-4 text-amber" />
          تحلیل قیمت
        </strong>
        <span className={`chip ${outlook.tone}`}>
          <Icon className="h-3.5 w-3.5" />
          {outlook.label}
        </span>
      </div>

      {/* شاخص برآیند از −۱۰۰ تا +۱۰۰ */}
      <div className="mt-3">
        <div className="relative h-2 rounded-pill bg-gradient-to-l from-green via-amber to-danger opacity-80">
          <span
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-surface bg-ink shadow"
            style={{ right: `calc(${(100 - analysis.score) / 2}% - 8px)` }}
          />
        </div>
        <p className="mt-2 text-[11.5px] text-sub">{analysis.summary}</p>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="RSI ۱۴" value={ind.rsi14 !== null ? fa(ind.rsi14) : "—"} />
        <Metric label="میانگین ۵۰" value={ind.sma50 ? formatPrice(ind.sma50) : "—"} />
        <Metric label="میانگین ۲۰۰" value={ind.sma200 ? formatPrice(ind.sma200) : "—"} />
        <Metric label="حمایت" value={ind.support ? formatPrice(ind.support) : "—"} />
        <Metric label="مقاومت" value={ind.resistance ? formatPrice(ind.resistance) : "—"} />
        <Metric label="نوسان ۳۰ روز" value={ind.volatility30 !== null ? `٪${fa(ind.volatility30)}` : "—"} />
      </dl>

      {analysis.special.length ? (
        <div className="mt-3 space-y-2">
          {analysis.special.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2">
              <span className="text-[11px] text-sub">
                {item.label}
                <small className="block text-[10px] text-muted">{item.hint}</small>
              </span>
              <strong className="tabular text-[13px]">{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {!compact ? (
        <>
          <h4 className="mt-4 text-[11.5px] font-bold">بازدهی</h4>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {analysis.changes.map((change) => (
              <div key={change.id} className="rounded-xl bg-surface px-2 py-2 text-center">
                <span className="block text-[10px] text-muted">{change.label}</span>
                <strong
                  className={`tabular text-[11.5px] ${
                    change.percent === null ? "text-faint" : change.percent >= 0 ? "text-green" : "text-danger"
                  }`}
                >
                  {percent(change.percent)}
                </strong>
              </div>
            ))}
          </div>

          <ul className="mt-4 space-y-1.5 text-[11.5px] leading-6 text-sub">
            {analysis.insights.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-green" />
                {line}
              </li>
            ))}
          </ul>

          {analysis.sources.length ? (
            <>
              <h4 className="mt-4 text-[11.5px] font-bold">منابع این نرخ</h4>
              <div className="mt-2 space-y-1.5">
                {analysis.sources.map((source) => (
                  <div key={source.key} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-sub">{source.title}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular">{formatPrice(source.price)}</span>
                      <small className={source.deviation >= 0 ? "text-green" : "text-danger"}>
                        {percent(source.deviation)}
                      </small>
                      <small className="w-[70px] text-left text-muted">{timeAgo(source.at)}</small>
                    </span>
                  </div>
                ))}
              </div>
              {analysis.confidence !== null ? (
                <p className="mt-2 text-[10.5px] text-muted">
                  اطمینان موتور تحلیل به این نرخ: ٪{fa(Math.round(analysis.confidence * 100))}
                </p>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <p className="mt-3 text-[10px] leading-5 text-faint">
        این تحلیل خودکار و صرفاً برای اطلاع است و توصیه‌ی خرید یا فروش نیست.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-2.5 py-2">
      <dt className="text-[10px] text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-[12px] font-bold">{value}</dd>
    </div>
  );
}
