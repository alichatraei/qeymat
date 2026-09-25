"use client";

import Link from "next/link";
import useSWR from "swr";
import { BellRing, Crown, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { fa, jalali, unitLabel } from "@qeymat/shared";
import PushToggle from "@/components/pwa/PushToggle";
import type { PlusStatus } from "@/lib/types";

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

type Response = { plus: PlusStatus; smsUsed: number; alerts: AlertRow[] };

const fetcher = (url: string) => fetch(url).then((response) => response.json());

/** فهرست هشدارهای قیمت کاربر در پنل، با وضعیت سهمیه‌ی پیامک */
export default function AlertsManager() {
  const { data, mutate, isLoading } = useSWR<Response>("/api/alerts", fetcher);

  const remove = async (id: string) => {
    await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    mutate();
  };

  if (isLoading || !data?.alerts) {
    return <div className="mt-6 h-[260px] animate-pulse rounded-card bg-soft" />;
  }

  const active = data.alerts.filter((alert) => alert.isActive);
  const fired = data.alerts.filter((alert) => !alert.isActive && alert.firedAt);

  return (
    <div className="mt-6 space-y-5">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-bold">
              <BellRing className="h-5 w-5 text-green" />
              هشدارهای قیمت
            </h2>
            <p className="mt-1.5 text-[11.5px] leading-6 text-muted">
              اعلان مرورگر برای همه‌ی کاربران رایگان است. پیامک مخصوص مشترکان قیمت پلاس است.
            </p>
          </div>
          <Link href="/chart" className="btn-solid h-10 min-h-0">
            <Plus />
            هشدار تازه
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-field p-4">
            <span className="text-[11px] text-muted">اعلان این دستگاه</span>
            <div className="mt-2">
              <PushToggle compact />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-field p-4">
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <MessageSquareText className="h-3.5 w-3.5" />
              هشدار پیامکی
            </span>
            {data.plus.active ? (
              <>
                <strong className="mt-2 block text-[15px]">
                  {fa(data.smsUsed)} از {fa(data.plus.smsLimit)} شاخص
                </strong>
                <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-tab">
                  <div
                    className="h-full rounded-pill bg-green"
                    style={{ width: `${Math.min(100, (data.smsUsed / Math.max(1, data.plus.smsLimit)) * 100)}%` }}
                  />
                </div>
                {data.plus.tier === "plus" ? (
                  <Link href="/plus#pro" className="mt-2 inline-block text-[11px] font-semibold text-green-dark">
                    شاخص بیشتر؟ پلاس حرفه‌ای (۵۰ شاخص) ←
                  </Link>
                ) : null}
              </>
            ) : (
              <Link href="/plus" className="btn-brand mt-2 h-9 min-h-0 w-full text-[11.5px]">
                <Crown />
                فعال‌سازی با قیمت پلاس
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="text-[13px] font-bold">فعال ({fa(active.length)})</h3>
        {active.length ? (
          <ul className="mt-3 divide-y divide-line">
            {active.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onDelete={() => remove(alert.id)} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-line py-8 text-center text-[12px] text-muted">
            هنوز هشداری ندارید. از صفحه‌ی نمودار یا با زدن روی هر نرخ، هشدار بگذارید.
          </p>
        )}
      </section>

      {fired.length ? (
        <section className="card p-6">
          <h3 className="text-[13px] font-bold">اجراشده</h3>
          <ul className="mt-3 divide-y divide-line">
            {fired.slice(0, 20).map((alert) => (
              <AlertItem key={alert.id} alert={alert} onDelete={() => remove(alert.id)} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function AlertItem({ alert, onDelete }: { alert: AlertRow; onDelete: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <Link href={`/chart?symbol=${alert.symbol}`} className="text-[12.5px] font-bold hover:text-green-dark">
          {alert.nameFa}
        </Link>
        <small className="text-[11px] text-muted">
          {alert.direction === "ABOVE" ? "بالاتر از" : "پایین‌تر از"} {fa(alert.threshold)} {unitLabel(alert.unit)}
          {alert.current ? ` · اکنون ${fa(alert.current)}` : ""}
        </small>
      </span>
      <span className="flex items-center gap-1.5">
        {alert.push ? <span className="chip bg-green-soft text-green-dark">اعلان</span> : null}
        {alert.sms ? <span className="chip bg-amber-soft text-amber-ink">پیامک</span> : null}
        {alert.firedAt ? <small className="text-[10.5px] text-muted">{jalali(alert.firedAt)}</small> : null}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger"
        aria-label="حذف هشدار"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
