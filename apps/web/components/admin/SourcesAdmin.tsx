"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Loader2, Plus, RefreshCw, Save, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { fa, timeAgo } from "@qeymat/shared";

export type SourceRow = {
  key: string;
  title: string;
  adapter: string;
  status: "ONLINE" | "SLOW" | "DOWN";
  isActive: boolean;
  intervalSec: number;
  weight: number;
  endpoint: string;
  lastFetchedAt: string | null;
  lastLatencyMs: number | null;
  lastError: string | null;
};

type Muted = { sources: string[]; pairs: Record<string, string[]> };
type Summary = { key: string; recent: number; medianDeviation: number; worst: { symbol: string; deviation: number }[] };
type QuoteRow = {
  sourceKey: string;
  title: string;
  sourceActive: boolean;
  sell: number;
  at: string;
  deviation: number | null;
  mutedSource: boolean;
  mutedPair: boolean;
};
type Readings = {
  asset: { symbol: string; nameFa: string; unit: string };
  rate: { sell: number; fetchedAt: string; confidence: number | null; sourceCount: number | null } | null;
  quotes: QuoteRow[];
};

const ADAPTERS = [
  ["custom-json", "JSON دلخواه (هر API)"],
  ["telegram", "کانال‌های تلگرام"],
  ["tgju", "TGJU"],
  ["alanchand", "الان‌چند"],
  ["bonbast", "بن‌بست"],
  ["nobitex", "نوبیتکس"],
  ["bitpin", "بیت‌پین"],
  ["wallex", "والکس"],
  ["tabdeal", "صرافی تبدیل"],
  ["arzdigital", "ارزدیجیتال"],
  ["navasan", "نوسان (وب‌سرویس)"],
  ["twelvedata", "TwelveData"],
] as const;

/** انحراف تا ۱٪ عادی، تا ۳٪ قابل توجه، بیشتر از آن مشکوک */
function deviationTone(value: number | null) {
  if (value === null) return "text-muted";
  const abs = Math.abs(value);
  if (abs <= 1) return "text-green-dark";
  if (abs <= 3) return "text-amber-ink";
  return "font-bold text-danger";
}

function percent(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}٪${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(Math.abs(value))}`;
}

function price(value: number) {
  return Math.abs(value) >= 1000 ? fa(Math.round(value)) : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 4 }).format(value);
}

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || "انجام نشد.");
  return payload;
}

export default function SourcesAdmin({
  sources,
  onFlash,
  onRun,
  busy,
}: {
  sources: SourceRow[];
  onFlash: (text: string) => void;
  onRun: (key: string) => void;
  busy: string;
}) {
  const router = useRouter();
  const [muted, setMuted] = useState<Muted>({ sources: [], pairs: {} });
  const [summary, setSummary] = useState<Map<string, Summary>>(new Map());
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      const data = await send("/api/admin/sources/quotes", "GET");
      setMuted(data.muted);
      setSummary(new Map((data.sources as Summary[]).map((item) => [item.key, item])));
    } catch {
      /* خلاصه اختیاری است */
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const act = async (id: string, run: () => Promise<unknown>, done: string) => {
    setWorking(id);
    try {
      await run();
      onFlash(done);
      await loadSummary();
      router.refresh();
      return true;
    } catch (error) {
      onFlash(error instanceof Error ? error.message : "انجام نشد.");
      return false;
    } finally {
      setWorking("");
    }
  };

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">منابع نرخ</h2>
            <p className="mt-1 text-[11.5px] leading-6 text-muted">
              «بی‌اثر»: منبع خوانده می‌شود و عددش را می‌بینید، ولی در قیمت نمایشی اثری ندارد. «غیرفعال»: اصلاً خوانده
              نمی‌شود.
            </p>
          </div>
          <button type="button" className="btn-solid h-10 min-h-0" onClick={() => setAdding(true)}>
            <Plus />
            افزودن منبع
          </button>
        </div>

        <div className="space-y-3">
          {sources.map((source) => (
            <SourceCard
              key={source.key}
              source={source}
              summary={summary.get(source.key)}
              isMuted={muted.sources.includes(source.key)}
              working={working === source.key || busy === source.key}
              onRun={() => onRun(source.key)}
              onToggleMute={() =>
                act(
                  source.key,
                  () => send("/api/admin/sources/mute", "POST", { key: source.key, muted: !muted.sources.includes(source.key) }),
                  muted.sources.includes(source.key) ? "منبع دوباره در قیمت اثر دارد." : "منبع بی‌اثر شد؛ فقط خوانده می‌شود.",
                )
              }
              onSave={(changes) =>
                act(source.key, () => send("/api/admin/sources", "PATCH", { key: source.key, ...changes }), "منبع ذخیره شد.")
              }
              onDelete={() => {
                if (!window.confirm(`منبع «${source.title}» و همه‌ی نرخ‌های خوانده‌شده‌اش حذف شود؟`)) return;
                act(source.key, () => send(`/api/admin/sources?key=${encodeURIComponent(source.key)}`, "DELETE"), "منبع حذف شد.");
              }}
            />
          ))}
        </div>
      </section>

      <ReadingsPanel muted={muted} onChanged={loadSummary} onFlash={onFlash} />

      {adding ? (
        <AddSource
          onClose={() => setAdding(false)}
          onCreate={async (body) => {
            const ok = await act("new", () => send("/api/admin/sources", "PUT", body), "منبع اضافه شد؛ در کمتر از ۱۰ دقیقه زمان‌بندی می‌شود.");
            if (ok) setAdding(false);
          }}
        />
      ) : null}
    </div>
  );
}

function SourceCard({
  source,
  summary,
  isMuted,
  working,
  onRun,
  onToggleMute,
  onSave,
  onDelete,
}: {
  source: SourceRow;
  summary?: Summary;
  isMuted: boolean;
  working: boolean;
  onRun: () => void;
  onToggleMute: () => void;
  onSave: (changes: { isActive?: boolean; intervalSec?: number; weight?: number }) => void;
  onDelete: () => void;
}) {
  const [intervalSec, setIntervalSec] = useState(String(source.intervalSec));
  const [weight, setWeight] = useState(String(source.weight));
  const dirty = Number(intervalSec) !== source.intervalSec || Number(weight) !== source.weight;

  const dot = !source.isActive
    ? "bg-faint/40"
    : isMuted
      ? "bg-amber"
      : source.status === "ONLINE"
        ? "bg-green-dot"
        : source.status === "SLOW"
          ? "bg-amber"
          : "bg-danger";

  return (
    <div className={`rounded-xl border p-4 ${isMuted ? "border-amber/40 bg-amber-soft/30" : "border-line bg-field"}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
        <span className="flex min-w-[170px] items-center gap-2">
          <i className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
          <b>{source.title}</b>
          <code dir="ltr" className="font-mono text-[10px] text-muted">
            {source.key}
          </code>
        </span>
        <span className="text-muted">
          {!source.isActive ? "غیرفعال" : source.status === "ONLINE" ? "متصل" : source.status === "SLOW" ? "کند" : "قطع"}
          {isMuted ? " · بی‌اثر" : ""}
        </span>
        <span className="text-muted">{source.lastFetchedAt ? timeAgo(source.lastFetchedAt) : "هنوز اجرا نشده"}</span>
        {summary ? (
          <span className="text-muted">
            {fa(summary.recent)} نرخ · انحراف میانه{" "}
            <b className={deviationTone(summary.medianDeviation)}>
              ٪{new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(summary.medianDeviation)}
            </b>
          </span>
        ) : null}
      </div>

      {summary?.worst.length && Math.abs(summary.worst[0].deviation) > 3 ? (
        <p className="mt-2 text-[10.5px] text-muted">
          بیشترین اختلاف:{" "}
          {summary.worst.map((item) => (
            <span key={item.symbol} className="ml-2 inline-block">
              <code dir="ltr">{item.symbol}</code> <b className={deviationTone(item.deviation)}>{percent(item.deviation)}</b>
            </span>
          ))}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="w-[110px]">
          <span className="mb-1 block text-[10px] text-muted">هر چند ثانیه</span>
          <input className="field h-9 tabular" dir="ltr" value={intervalSec} onChange={(event) => setIntervalSec(event.target.value)} />
        </label>
        <label className="w-[90px]">
          <span className="mb-1 block text-[10px] text-muted">وزن</span>
          <input className="field h-9 tabular" dir="ltr" value={weight} onChange={(event) => setWeight(event.target.value)} />
        </label>
        {dirty ? (
          <button
            type="button"
            className="btn-solid h-9 min-h-0 px-3 text-[11px]"
            disabled={working}
            onClick={() => onSave({ intervalSec: Number(intervalSec), weight: Number(weight) })}
          >
            <Save className="h-3.5 w-3.5" />
            ذخیره
          </button>
        ) : null}
        <span className="mr-auto flex flex-wrap gap-2">
          <button type="button" className="btn-ghost h-9 min-h-0 px-3 text-[11px]" disabled={working} onClick={onToggleMute}>
            {isMuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {isMuted ? "اثر دوباره" : "بی‌اثر"}
          </button>
          <button
            type="button"
            className="btn-ghost h-9 min-h-0 px-3 text-[11px]"
            disabled={working}
            onClick={() => onSave({ isActive: !source.isActive })}
          >
            <EyeOff className="h-3.5 w-3.5" />
            {source.isActive ? "غیرفعال" : "فعال"}
          </button>
          <button type="button" className="btn-ghost h-9 min-h-0 px-3 text-[11px]" disabled={working || !source.isActive} onClick={onRun}>
            {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            اجرا
          </button>
          <button type="button" className="btn-ghost h-9 min-h-0 px-3 text-[11px] text-danger" disabled={working} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </button>
        </span>
      </div>

      {source.lastError ? (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[10.5px] text-danger-ink">{source.lastError}</p>
      ) : null}
    </div>
  );
}

/** عددی که هر منبع برای یک دارایی می‌خواند، کنار نرخ نهایی */
function ReadingsPanel({ muted, onChanged, onFlash }: { muted: Muted; onChanged: () => void; onFlash: (text: string) => void }) {
  const [assets, setAssets] = useState<{ symbol: string; nameFa: string }[]>([]);
  const [symbol, setSymbol] = useState("USD");
  const [data, setData] = useState<Readings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/rates")
      .then((response) => response.json())
      .then((snapshot) => setAssets(snapshot.assets.map((asset: { symbol: string; nameFa: string }) => ({ symbol: asset.symbol, nameFa: asset.nameFa }))))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await send(`/api/admin/sources/quotes?symbol=${encodeURIComponent(symbol)}`, "GET"));
    } catch (error) {
      onFlash(error instanceof Error ? error.message : "خواندن نرخ‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [symbol, onFlash]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePair = async (key: string, next: boolean) => {
    try {
      await send("/api/admin/sources/mute", "POST", { key, symbol, muted: next });
      onFlash(next ? `این منبع برای ${symbol} بی‌اثر شد.` : `این منبع برای ${symbol} دوباره اثر دارد.`);
      onChanged();
      load();
    } catch (error) {
      onFlash(error instanceof Error ? error.message : "انجام نشد.");
    }
  };

  const options = useMemo(() => assets, [assets]);

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold">نرخ‌های خوانده‌شده</h2>
          <p className="mt-1 text-[11.5px] leading-6 text-muted">
            عددی که هر منبع همین حالا برای یک دارایی می‌خواند و فاصله‌اش با قیمت نهایی. منبعی که پرت می‌دهد را برای همین
            دارایی بی‌اثر کنید.
          </p>
        </div>
        <span className="flex items-end gap-2">
          <select className="field h-10 w-[200px]" value={symbol} onChange={(event) => setSymbol(event.target.value)} aria-label="دارایی">
            {options.length ? (
              options.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.nameFa} · {asset.symbol}
                </option>
              ))
            ) : (
              <option value="USD">دلار آمریکا · USD</option>
            )}
          </select>
          <button type="button" className="btn-ghost h-10 min-h-0" onClick={load} aria-label="تازه‌سازی">
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </button>
        </span>
      </div>

      {data?.rate ? (
        <p className="mb-3 rounded-xl bg-green-soft/60 px-4 py-2.5 text-[12px]">
          قیمت نهایی <b className="tabular">{price(data.rate.sell)}</b> {data.asset.unit === "USD" ? "دلار" : "تومان"} ·{" "}
          {fa(data.rate.sourceCount ?? 0)} منبع · {timeAgo(data.rate.fetchedAt)}
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="w-full min-w-[560px] text-right text-[12px]">
          <thead className="text-xxs text-muted">
            <tr>
              <th className="pb-3 font-semibold">منبع</th>
              <th className="pb-3 font-semibold">عدد خوانده‌شده</th>
              <th className="pb-3 font-semibold">اختلاف با نهایی</th>
              <th className="pb-3 font-semibold">زمان</th>
              <th className="pb-3 font-semibold">اثر در قیمت</th>
            </tr>
          </thead>
          <tbody>
            {(data?.quotes ?? []).map((quote) => {
              const inactive = quote.mutedSource || quote.mutedPair || !quote.sourceActive;
              return (
                <tr key={quote.sourceKey} className={`border-t border-line ${inactive ? "opacity-60" : ""}`}>
                  <td className="py-3">
                    <b className="block">{quote.title}</b>
                    <code dir="ltr" className="text-[10px] text-muted">
                      {quote.sourceKey}
                    </code>
                  </td>
                  <td className="tabular py-3">{price(quote.sell)}</td>
                  <td className={`tabular py-3 ${deviationTone(quote.deviation)}`}>{percent(quote.deviation)}</td>
                  <td className="py-3 text-muted">{timeAgo(quote.at)}</td>
                  <td className="py-3">
                    {quote.mutedSource ? (
                      <span className="text-[11px] text-amber-ink">کل منبع بی‌اثر است</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost h-8 min-h-0 px-2.5 text-[11px]"
                        onClick={() => togglePair(quote.sourceKey, !quote.mutedPair)}
                      >
                        {quote.mutedPair ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                        {quote.mutedPair ? "اثر دوباره" : "بی‌اثر برای این دارایی"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && !data.quotes.length ? (
          <p className="py-8 text-center text-[12px] text-muted">هیچ منبعی برای این دارایی عدد نخوانده است.</p>
        ) : null}
      </div>
      {Object.keys(muted.pairs).length ? (
        <p className="mt-3 text-[10.5px] text-muted">
          بی‌اثر برای دارایی خاص:{" "}
          {Object.entries(muted.pairs).map(([asset, keys]) => (
            <span key={asset} className="ml-3 inline-block">
              <code dir="ltr">{asset}</code>: {keys.join("، ")}
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}

function AddSource({ onClose, onCreate }: { onClose: () => void; onCreate: (body: object) => Promise<void> }) {
  const [form, setForm] = useState({
    key: "",
    title: "",
    adapter: "custom-json",
    endpoint: "",
    intervalSec: "60",
    weight: "1",
    config: '{\n  "listPath": "data",\n  "symbolKey": "symbol",\n  "sellKey": "price",\n  "unit": "IRT"\n}',
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");
    let config: unknown = {};
    try {
      config = form.config.trim() ? JSON.parse(form.config) : {};
    } catch {
      setError("تنظیمات باید JSON معتبر باشد.");
      return;
    }
    setSaving(true);
    await onCreate({
      key: form.key.trim(),
      title: form.title.trim(),
      adapter: form.adapter,
      endpoint: form.endpoint.trim(),
      intervalSec: Number(form.intervalSec),
      weight: Number(form.weight),
      config,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="افزودن منبع">
      <button type="button" className="absolute inset-0 bg-overlay/45" onClick={onClose} aria-label="بستن" />
      <div className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[24px] bg-surface p-5 shadow-drawer sm:rounded-[24px]">
        <div className="flex items-center justify-between">
          <strong className="text-[14px]">افزودن منبع</strong>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[10px] border border-line" aria-label="بستن">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xxs text-sub">کلید (انگلیسی)</span>
            <input className="field" dir="ltr" placeholder="my-exchange" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-xxs text-sub">عنوان</span>
            <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xxs text-sub">نوع (آداپتور)</span>
            <select className="field" value={form.adapter} onChange={(e) => setForm({ ...form, adapter: e.target.value })}>
              {ADAPTERS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xxs text-sub">نشانی (API یا صفحه)</span>
            <input className="field" dir="ltr" placeholder="https://…" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-xxs text-sub">هر چند ثانیه</span>
            <input className="field tabular" dir="ltr" value={form.intervalSec} onChange={(e) => setForm({ ...form, intervalSec: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-xxs text-sub">وزن در اجماع (۰٫۱ تا ۳)</span>
            <input className="field tabular" dir="ltr" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xxs text-sub">تنظیمات (JSON)</span>
            <textarea
              className="field h-36 py-2 font-mono text-[11px]"
              dir="ltr"
              value={form.config}
              onChange={(e) => setForm({ ...form, config: e.target.value })}
            />
            <small className="mt-1 block text-[10.5px] leading-5 text-muted">
              برای «JSON دلخواه»: listPath مسیر آرایه، symbolKey کلید نماد (مثل USD)، sellKey کلید قیمت، unit واحد (IRT
              تومان، IRR ریال، USD دلار).
            </small>
          </label>
        </div>
        {error ? <p className="mt-3 text-[11.5px] text-danger">{error}</p> : null}
        <button type="button" className="btn-solid mt-4 h-11 w-full" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Plus />}
          افزودن
        </button>
      </div>
    </div>
  );
}
