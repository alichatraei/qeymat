"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Repeat, X } from "lucide-react";
import { fa, movement, timeAgo } from "@qeymat/shared";
import RateIcon from "./RateIcon";
import PriceChart from "./PriceChart";
import type { HistoryPoint, RateView } from "@/lib/types";

const RANGES = [
  { id: 7, label: "۷ روز" },
  { id: 30, label: "ماه" },
  { id: 90, label: "۳ ماه" },
  { id: 365, label: "سال" },
];

export default function RateDrawer({ rate, onClose }: { rate: RateView; onClose: () => void }) {
  const [range, setRange] = useState(7);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertState, setAlertState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [threshold, setThreshold] = useState(String(Math.round(rate.sell / 1000) * 1000));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/public/history?symbol=${rate.symbol}&range=${range}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setHistory(payload.data ?? []);
      })
      .catch(() => !cancelled && setHistory([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [rate.symbol, range]);

  const createAlert = async () => {
    setAlertState("saving");
    try {
      const response = await fetch("/api/push/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: rate.symbol,
          threshold: Number(threshold),
          direction: Number(threshold) >= rate.sell ? "ABOVE" : "BELOW",
        }),
      });
      setAlertState(response.ok ? "saved" : "error");
    } catch {
      setAlertState("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`جزئیات ${rate.nameFa}`}>
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-[rgba(7,26,19,.32)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="بستن"
      />
      <aside className="absolute inset-y-0 right-0 flex w-[min(460px,100%)] animate-drawer-in flex-col overflow-y-auto bg-white shadow-drawer">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-[#55616a] hover:bg-soft"
            aria-label="بستن"
          >
            <X className="h-[17px] w-[17px]" />
          </button>
          <span className="text-[12.5px] font-bold">جزئیات نرخ</span>
          <span className="h-9 w-9" />
        </div>

        <div className="px-5 pb-8">
          <div className="mt-5 flex items-center gap-3.5">
            <RateIcon rate={rate} size="large" />
            <div>
              <h2 className="text-[21px] font-bold tracking-[-.5px]">{rate.nameFa}</h2>
              <small className="text-[11.5px] text-muted">
                {rate.symbol} · {rate.sourceLabel}
              </small>
            </div>
          </div>

          <div className="mt-6 flex items-end gap-2.5">
            <strong className="tabular text-[40px] font-extrabold leading-none tracking-[-1.8px]">
              {fa(rate.sell)}
            </strong>
            <span className="pb-1 text-[13px] text-[#66727b]">تومان</span>
          </div>
          <small
            className={`mt-2 block text-[12px] font-bold ${
              rate.changePercent >= 0 ? "text-green" : "text-danger"
            }`}
          >
            {movement(rate.changePercent)} نسبت به دیروز
          </small>

          <div className="mt-5 inline-grid grid-cols-4 gap-1 rounded-xl bg-[#f0f4f2] p-1">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRange(item.id)}
                className={`h-9 rounded-[9px] px-3 text-[11.5px] font-semibold transition-colors ${
                  range === item.id
                    ? "bg-green-soft text-green-dark shadow-[0_1px_3px_rgba(9,69,48,.06)]"
                    : "text-[#5d6870]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-5 h-[230px] animate-pulse rounded-2xl bg-soft" />
          ) : (
            <PriceChart data={history} height={230} />
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stat label="کمترین امروز" value={rate.dayLow ?? rate.sell * 0.984} />
            <Stat label="بیشترین امروز" value={rate.dayHigh ?? rate.sell * 1.017} />
            <Stat label="قیمت خرید" value={rate.buy} />
            <div className="rounded-xl border border-line bg-[#fbfcfb] p-3.5">
              <span className="block text-2xs text-muted">آخرین دریافت</span>
              <strong className="mt-1.5 block text-[13px]">{timeAgo(rate.fetchedAt)}</strong>
            </div>
          </div>

          <div className="mt-6 rounded-card border border-line bg-[#fbfcfb] p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-green" />
              <strong className="text-[12.5px]">هشدار قیمت</strong>
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              وقتی {rate.nameFa} به قیمت دلخواه شما رسید، اعلان مرورگر دریافت کنید.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="field flex-1 tabular"
                value={threshold}
                inputMode="numeric"
                onChange={(event) => {
                  setThreshold(event.target.value.replace(/[^\d]/g, ""));
                  setAlertState("idle");
                }}
                aria-label="قیمت هدف به تومان"
              />
              <button
                type="button"
                className="btn-solid"
                onClick={createAlert}
                disabled={alertState === "saving" || !threshold}
              >
                {alertState === "saved" ? "ثبت شد" : "ثبت هشدار"}
              </button>
            </div>
            {alertState === "error" ? (
              <p className="mt-2 text-[11px] text-danger">
                برای ثبت هشدار، ابتدا اعلان مرورگر را روشن کنید.
              </p>
            ) : null}
          </div>

          <Link href={`/converter?symbol=${rate.symbol}`} className="btn-solid mt-5 w-full">
            <Repeat />
            تبدیل {rate.nameFa}
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-[#fbfcfb] p-3.5">
      <span className="block text-2xs text-muted">{label}</span>
      <strong className="tabular mt-1.5 block text-[13px]">{fa(Math.round(value))}</strong>
    </div>
  );
}
