"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BellPlus, ChevronDown, LogIn, Trash2 } from "lucide-react";
import { fa, jalali, unitLabel } from "@qeymat/shared";
import AssetIcon from "./AssetIcon";
import AssetPicker from "./AssetPicker";
import AlertForm from "./AlertForm";
import { formatPrice } from "./PriceChart";
import { DIR_CLASS, directionOf } from "./marketFormat";
import type { MarketSnapshot, PlusStatus, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

type AlertRow = {
  id: string;
  symbol: string;
  nameFa: string;
  unit: string;
  current: number | null;
  direction: "ABOVE" | "BELOW";
  threshold: number;
  push: boolean;
  sms: boolean;
  isActive: boolean;
  firedAt: string | null;
  createdAt: string;
};

type AlertsResponse =
  | { plus: PlusStatus; smsUsed: number; alerts: AlertRow[] }
  | { error: { code: string; message: string } };

type Filter = "all" | "active" | "triggered" | "paused";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "همه" },
  { id: "active", label: "فعال" },
  { id: "triggered", label: "رسیده" },
  { id: "paused", label: "متوقف" },
];

function statusOf(alert: AlertRow): Filter {
  if (alert.firedAt) return "triggered";
  return alert.isActive ? "active" : "paused";
}

export default function AlertsBoard({ initialSnapshot }: { initialSnapshot: MarketSnapshot }) {
  const { data, mutate } = useSWR<AlertsResponse>("/api/alerts", fetcher);
  const { data: market } = useSWR<MarketSnapshot>("/api/public/rates", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 30000,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [formSymbol, setFormSymbol] = useState("USD");
  const [picking, setPicking] = useState(false);

  const snapshot = market ?? initialSnapshot;
  const bySymbol = useMemo(() => new Map(snapshot.assets.map((asset) => [asset.symbol, asset])), [snapshot.assets]);
  const formRate = bySymbol.get(formSymbol) ?? snapshot.assets[0];

  const loggedIn = data && !("error" in data);
  const alerts: AlertRow[] = loggedIn ? (data as { alerts: AlertRow[] }).alerts : [];
  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: alerts.length, active: 0, triggered: 0, paused: 0 };
    for (const alert of alerts) result[statusOf(alert)] += 1;
    return result;
  }, [alerts]);
  const visible = filter === "all" ? alerts : alerts.filter((alert) => statusOf(alert) === filter);

  const toggle = async (alert: AlertRow) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: alert.id, isActive: !alert.isActive || Boolean(alert.firedAt) }),
    });
    mutate();
  };

  const remove = async (alert: AlertRow) => {
    await fetch(`/api/alerts?id=${alert.id}`, { method: "DELETE" });
    mutate();
  };

  /* ------------------------------- مهمان ------------------------------- */
  if (data && !loggedIn) {
    return (
      <main className="content-width pb-24 pt-10">
        <div className="mx-auto max-w-[520px] text-center">
          <svg width="56" height="56" viewBox="0 0 24 24" className="mx-auto overflow-visible" aria-hidden="true">
            <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 5.5 2.5 7.5 2.5 7.5H4s2.5-2 2.5-7.5M10.2 20.5a2 2 0 0 0 3.6 0" fill="none" stroke="rgb(var(--c-ink))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="17" y="1.5" width="4" height="4" rx="0.9" fill="rgb(var(--c-icon-dot))" className="dot-pulse" />
          </svg>
          <h1 className="mt-5 text-[25px] font-extrabold tracking-[-.5px]">هشدار قیمت دلار و طلا</h1>
          <p className="mt-3 text-[13.5px] leading-7 text-sub">
            قیمت هدف بگذارید؛ وقتی رسید اعلان می‌گیرید و با قیمت پلاس پیامک هم می‌آید. بدون چک کردن مدام.
          </p>
          <Link href="/login?next=/alerts" className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-[10px] bg-brand px-6 text-[14px] font-bold text-brand-cream dark:bg-brand-mint dark:text-brand-deep">
            <LogIn className="h-[18px] w-[18px]" />
            ورود برای ساخت هشدار
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="content-width pb-24 pt-5">
      <h1 className="text-[25px] font-extrabold tracking-[-.5px]">هشدارهای قیمت</h1>
      <p className="mt-1 text-[12.5px] text-muted">وقتی قیمت به عددی که گذاشتی رسید، خبرت می‌کنیم.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <div className="flex gap-0.5 overflow-x-auto border-b border-line" role="tablist" aria-label="فیلتر هشدارها">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`-mb-px inline-flex min-h-[46px] shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13.5px] font-bold transition-colors ${
                  filter === item.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-sub"
                }`}
              >
                {item.label}
                <span className="tabular text-[11px] font-medium text-muted">{fa(counts[item.id])}</span>
              </button>
            ))}
          </div>

          {!data ? (
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-[76px] animate-pulse rounded-[16px] bg-soft" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2.5 rounded-[24px] border border-dashed border-line-strong p-9 text-center">
              <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" className="overflow-visible">
                <path d="M18.93 16A8 8 0 1 0 16 18.93" fill="none" stroke="rgb(var(--c-line-strong))" strokeWidth="1.6" strokeLinecap="round" />
                <rect x="16.6" y="16.6" width="4" height="4" rx="0.9" fill="rgb(var(--c-icon-dot))" className="dot-pulse" />
              </svg>
              <b className="text-[15px]">{filter === "all" ? "هنوز هشداری نساختی" : "هشداری در این وضعیت نیست"}</b>
              <span className="text-[12.5px] text-sub">دارایی و قیمت هدف را در فرم کنار انتخاب کن.</span>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {visible.map((alert) => {
                const status = statusOf(alert);
                const asset = bySymbol.get(alert.symbol);
                const current = asset?.sell ?? alert.current;
                const unit = unitLabel(alert.unit);
                const distance = current ? Math.abs((alert.threshold - current) / current) * 100 : null;
                const progress = distance === null ? 0 : Math.max(0, Math.min(1, 1 - distance / 10));
                const dirClass = asset ? DIR_CLASS[directionOf(asset.changePercent)] : "text-ink";
                return (
                  <li
                    key={alert.id}
                    className={`card flex flex-wrap items-center gap-3 p-3.5 sm:flex-nowrap ${status === "paused" ? "opacity-55" : ""}`}
                  >
                    {asset ? <AssetIcon rate={asset} size={44} /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-[13.5px]">{alert.nameFa}</strong>
                        <StatusBadge status={status} />
                      </div>
                      <p className="mt-0.5 text-[12px] text-sub">
                        {alert.direction === "ABOVE" ? "بالاتر از" : "پایین‌تر از"}{" "}
                        <b className="tabular">{formatPrice(alert.threshold)}</b> {unit}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted">
                        {alert.sms ? "اعلان و پیامک" : "اعلان"} · ساخت {jalali(alert.createdAt)}
                      </p>
                    </div>
                    <div className="flex w-[130px] shrink-0 flex-col items-end gap-1">
                      <b className={`tabular text-[13.5px] ${dirClass}`}>{current ? formatPrice(current) : "—"}</b>
                      {status === "active" && distance !== null ? (
                        <>
                          <span className="text-[10.5px] text-muted">
                            {fa(Number(distance.toFixed(1)))}٪ مانده
                          </span>
                          <span className="h-1 w-full overflow-hidden rounded-full bg-tab" role="img" aria-label={`${fa(Number(distance.toFixed(1)))} درصد مانده تا هدف`}>
                            <span className="block h-full rounded-full bg-green-dot" style={{ width: `${progress * 100}%` }} />
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={alert.isActive && !alert.firedAt}
                        aria-label={`فعال بودن هشدار ${alert.nameFa}`}
                        onClick={() => toggle(alert)}
                        className={`relative h-7 w-12 rounded-full transition-colors ${
                          alert.isActive && !alert.firedAt ? "bg-green" : "bg-line-strong"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-[inset-inline-start] duration-200 ${
                            alert.isActive && !alert.firedAt ? "start-6" : "start-1"
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(alert)}
                        aria-label={`حذف هشدار ${alert.nameFa}`}
                        className="grid h-10 w-10 place-items-center rounded-[10px] text-muted transition-colors hover:bg-soft hover:text-danger-ink"
                      >
                        <Trash2 className="h-[17px] w-[17px]" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* --------------------------- فرم هشدار جدید --------------------------- */}
        <aside className="min-w-0">
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <BellPlus className="h-[18px] w-[18px]" />
              <strong className="text-[13.5px]">هشدار جدید</strong>
            </div>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="mt-3 flex h-[46px] w-full items-center gap-2.5 rounded-control border border-line bg-field px-2.5 text-right transition-colors hover:border-line-strong"
              aria-label={`دارایی: ${formRate?.nameFa ?? ""}`}
            >
              {formRate ? <AssetIcon rate={formRate} size={28} /> : null}
              <strong className="min-w-0 flex-1 truncate text-[12.5px]">{formRate?.nameFa}</strong>
              <ChevronDown className="h-4 w-4 shrink-0 text-faint" />
            </button>
          </div>
          {formRate ? <AlertForm key={formRate.symbol} rate={formRate} /> : null}
        </aside>
      </div>

      {picking ? (
        <AssetPicker
          assets={snapshot.assets}
          exclude={[]}
          title="انتخاب دارایی"
          onSelect={(symbol) => {
            setFormSymbol(symbol);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </main>
  );
}

function StatusBadge({ status }: { status: Filter }) {
  if (status === "triggered") {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-cream dark:bg-brand-mint dark:text-brand-deep">
        <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" className="overflow-visible">
          <path d="M18.93 16A8 8 0 1 0 16 18.93" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="16" y="16" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
        </svg>
        رسید
      </span>
    );
  }
  if (status === "paused") {
    return <span className="rounded-pill bg-tab px-2 py-0.5 text-[10px] font-bold text-muted">متوقف</span>;
  }
  return <span className="rounded-pill bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green-dark">فعال</span>;
}
