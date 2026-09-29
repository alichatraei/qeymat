"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowUpDown, Check, Clock, Copy, Image as ImageIcon, Loader2, Share2, X } from "lucide-react";
import { fa, parseNumber, clock } from "@qeymat/shared";
import RateIcon from "./RateIcon";
import { formatPrice } from "./PriceChart";
import {
  conversionImage,
  conversionText,
  shareImage,
  shareText,
  type Conversion,
  type ShareOutcome,
} from "@/lib/share-conversion";
import type { MarketSnapshot, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());
const QUICK = [1, 100, 500, 1000];
/** تومان یک گزینه‌ی مجازی کنار دارایی‌هاست */
const TOMAN = "IRT";

export default function ConverterBoard({
  initialSnapshot,
  initialSymbol = "USD",
}: {
  initialSnapshot: MarketSnapshot;
  initialSymbol?: string;
}) {
  const { data } = useSWR<MarketSnapshot>("/api/public/rates", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 60000,
  });

  const assets = (data ?? initialSnapshot).assets;
  const [from, setFrom] = useState(initialSymbol);
  const [to, setTo] = useState(TOMAN);
  const [amount, setAmount] = useState("۱۰۰");
  const [sharing, setSharing] = useState(false);

  const bySymbol = useMemo(() => new Map(assets.map((asset) => [asset.symbol, asset])), [assets]);
  const usdToman = bySymbol.get("USD")?.sell ?? 0;

  /** ارزش یک واحد به تومان؛ دارایی‌های دلاری (نفت، سهام) با نرخ دلار تبدیل می‌شوند */
  const tomanOf = (symbol: string) => {
    if (symbol === TOMAN) return 1;
    const asset = bySymbol.get(symbol);
    if (!asset) return 0;
    return asset.unit === "USD" ? asset.sell * usdToman : asset.sell;
  };
  const nameOf = (symbol: string) => (symbol === TOMAN ? "تومان" : (bySymbol.get(symbol)?.nameFa ?? symbol));

  const value = parseNumber(amount);
  const fromToman = tomanOf(from);
  const toToman = tomanOf(to);
  const result = fromToman && toToman ? (value * fromToman) / toToman : 0;
  const resultText = formatAmount(result);
  const ready = value > 0 && result > 0;

  const rateLine =
    to === TOMAN || from === TOMAN
      ? `هر ${nameOf(from === TOMAN ? to : from)} = ${fa(Math.round(tomanOf(from === TOMAN ? to : from)))} تومان`
      : `هر ${nameOf(from)} = ${formatAmount(fromToman / toToman)} ${nameOf(to)}`;

  const fromAsset = bySymbol.get(from);
  const popular = assets.filter((asset) => asset.category === "CURRENCY" && asset.featured !== false).slice(0, 6);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <main className="pb-20 pt-10">
      <section className="content-width max-w-[980px]">
        <div className="max-w-[52ch]">
          <span className="text-[11.5px] font-bold text-green-dark">تبدیل ارزها</span>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-[-1px] sm:text-[32px]">
            هر ارزی را به تومان یا ارز دیگر تبدیل کنید
          </h1>
          <p className="mt-3 text-[13px] leading-7 text-muted">
            با نرخ لحظه‌ای بازار؛ نتیجه را به‌صورت متن یا تصویر برای دیگران بفرستید.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.8fr)]">
          <div className="card p-5 shadow-card sm:p-6">
            <label className="block">
              <span className="mb-2 block text-xxs text-sub">مبلغ</span>
              <input
                value={amount}
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                className="tabular h-[62px] w-full rounded-xl border border-line-strong bg-field px-4 text-[26px] font-bold outline-none focus:bg-surface"
                aria-label="مبلغ"
              />
            </label>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <CurrencySelect label="از" value={from} onChange={setFrom} assets={assets} />
              <button
                type="button"
                onClick={swap}
                className="mb-0.5 grid h-11 w-11 place-items-center rounded-control border border-line bg-surface text-sub hover:bg-soft"
                aria-label="جابه‌جایی ارز مبدأ و مقصد"
              >
                <ArrowUpDown className="h-[18px] w-[18px] rotate-90" />
              </button>
              <CurrencySelect label="به" value={to} onChange={setTo} assets={assets} />
            </div>

            <div className="mt-5 rounded-xl border border-line bg-field p-5">
              <span className="block text-xxs text-muted">
                {fa(value)} {nameOf(from)} برابر است با
              </span>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                <strong className="tabular break-all text-[32px] font-extrabold tracking-[-1.2px] text-green-dark">
                  {resultText}
                </strong>
                <small className="text-[13px] text-muted">{nameOf(to)}</small>
              </div>
              <p className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {rateLine}
                {fromAsset ? ` · ساعت ${clock(fromAsset.fetchedAt)}` : ""}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(fa(quick))}
                  className="rounded-[10px] border border-line bg-surface px-3 py-2 text-[11.5px] font-semibold text-sub hover:border-line-strong hover:bg-soft"
                >
                  {fa(quick)} {nameOf(from)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSharing(true)}
              disabled={!ready}
              className="btn-solid mt-5 h-12 w-full"
            >
              <Share2 />
              اشتراک‌گذاری تبدیل
            </button>
          </div>

          <aside className="card p-5">
            <h2 className="text-[14px] font-bold">ارزهای پرکاربرد</h2>
            <div className="mt-3 space-y-1.5">
              {popular.map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setFrom(item.symbol)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition-colors ${
                    from === item.symbol ? "border-green-soft bg-green-soft" : "border-transparent hover:bg-soft"
                  }`}
                >
                  <RateIcon rate={item} size="small" />
                  <strong className="flex-1 text-[12.5px]">{item.nameFa}</strong>
                  <b className="tabular text-[12.5px] font-bold">{formatPrice(item.sell)}</b>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {sharing ? (
        <ShareDialog
          conversion={{
            amount: fa(value),
            fromName: nameOf(from),
            toName: nameOf(to),
            result: resultText,
            rateLine,
            // لحظه‌ی اشتراک، نه زمان آخرین نرخ؛ گیرنده می‌بیند تبدیل کی انجام شده
            at: new Date(),
          }}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </main>
  );
}

/** عدد بزرگ بدون اعشار، عدد کوچک (مثل تومان به بیت‌کوین) با اعشار کافی */
function formatAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "۰";
  if (value >= 100) return fa(Math.round(value));
  return new Intl.NumberFormat("fa-IR", { maximumSignificantDigits: 6 }).format(value);
}

function CurrencySelect({
  label,
  value,
  onChange,
  assets,
}: {
  label: string;
  value: string;
  onChange: (symbol: string) => void;
  assets: RateView[];
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xxs text-sub">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="field" aria-label={`ارز ${label}`}>
        <option value={TOMAN}>تومان</option>
        {assets.map((asset) => (
          <option key={asset.symbol} value={asset.symbol}>
            {asset.nameFa}
          </option>
        ))}
      </select>
    </label>
  );
}

function ShareDialog({ conversion, onClose }: { conversion: Conversion; onClose: () => void }) {
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<"text" | "image" | null>(null);
  const [notice, setNotice] = useState("");
  const text = conversionText(conversion);

  useEffect(() => {
    let url = "";
    conversionImage(conversion)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => setFailed(true));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
    // تصویر یک‌بار برای همین تبدیل ساخته می‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const report = (outcome: ShareOutcome, kind: "text" | "image") => {
    if (outcome === "copied") setNotice("متن کپی شد؛ هر جا خواستید بچسبانید.");
    else if (outcome === "downloaded") setNotice("تصویر ذخیره شد.");
    else if (outcome === "shared") setNotice(kind === "image" ? "تصویر فرستاده شد." : "متن فرستاده شد.");
  };

  const sendText = async () => {
    setBusy("text");
    try {
      report(await shareText(text), "text");
    } catch {
      setNotice("ارسال متن ممکن نشد.");
    } finally {
      setBusy(null);
    }
  };

  const sendImage = async () => {
    if (!image) return;
    setBusy("image");
    try {
      report(await shareImage(image.blob, "https://qeymat.online"), "image");
    } catch {
      setNotice("ارسال تصویر ممکن نشد.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="اشتراک‌گذاری تبدیل">
      <button type="button" className="absolute inset-0 animate-fade-in bg-overlay/45 backdrop-blur-[2px]" onClick={onClose} aria-label="بستن" />
      <div className="relative max-h-[92vh] w-full max-w-[440px] animate-rise-in overflow-y-auto rounded-t-[28px] bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-drawer sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <strong className="text-[14px]">اشتراک‌گذاری تبدیل</strong>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-sub hover:bg-soft" aria-label="بستن">
            <X className="h-[17px] w-[17px]" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-field">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt="پیش‌نمایش تصویر تبدیل" className="block aspect-[4/5] w-full" />
          ) : failed ? (
            <p className="grid aspect-[4/5] place-items-center p-6 text-center text-[12px] text-muted">ساخت تصویر ممکن نشد؛ متن را بفرستید.</p>
          ) : (
            <div className="grid aspect-[4/5] place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-faint" />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={sendImage} disabled={!image || busy !== null} className="btn-solid h-12">
            {busy === "image" ? <Loader2 className="animate-spin" /> : <ImageIcon />}
            ارسال تصویر
          </button>
          <button type="button" onClick={sendText} disabled={busy !== null} className="btn-ghost h-12">
            {busy === "text" ? <Loader2 className="animate-spin" /> : <Copy />}
            ارسال متن
          </button>
        </div>

        <details className="mt-3 rounded-xl border border-line bg-field px-3.5 py-2.5 text-[11.5px]">
          <summary className="cursor-pointer font-semibold text-sub">متنی که فرستاده می‌شود</summary>
          <pre className="mt-2 whitespace-pre-wrap font-[inherit] leading-6 text-muted">{text}</pre>
        </details>

        {notice ? (
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold text-green-dark">
            <Check className="h-4 w-4" />
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
