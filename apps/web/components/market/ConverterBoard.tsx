"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Check, ChevronDown, Copy, Image as ImageIcon, Loader2, Share2, X } from "lucide-react";
import { clock, timeAgo } from "@qeymat/shared";
import AssetIcon from "./AssetIcon";
import AssetPicker from "./AssetPicker";
import { amountDisplay, amountInWords, convertAmount, toLatinDigits } from "./convertFormat";
import {
  conversionImage,
  conversionText,
  shareImage,
  shareText,
  type Conversion,
  type ShareOutcome,
} from "@/lib/share-conversion";
import type { MarketSnapshot } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

/** تومان یک گزینهٔ مجازی کنار دارایی‌هاست */
const TOMAN = "IRT";
const LAST_PAIR_KEY = "convert.lastPair";
const QUICK = ["100", "500", "1000", "10000"];
/** نرخ قدیمی‌تر از نیم ساعت، «قدیمی» نشان داده می‌شود */
const STALE_MS = 30 * 60 * 1000;

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;
const FA_KEY: Record<string, string> = { "1": "۱", "2": "۲", "3": "۳", "4": "۴", "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹", "0": "۰" };

/** جفت‌های پرکاربرد، مطابق آرت‌برد وب */
const PAIRS: { from: string; to: string; title: string }[] = [
  { from: "USD", to: TOMAN, title: "دلار به تومان" },
  { from: "EMAMI", to: TOMAN, title: "سکه به تومان" },
  { from: "EUR", to: "USD", title: "یورو به دلار" },
  { from: "USDT", to: TOMAN, title: "تتر به تومان" },
];

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
  const bySymbol = useMemo(() => new Map(assets.map((asset) => [asset.symbol, asset])), [assets]);

  const [from, setFrom] = useState(initialSymbol);
  const [to, setTo] = useState(TOMAN);
  const [amt, setAmt] = useState("1000");
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [sharing, setSharing] = useState(false);

  // آخرین جفت ارز روی دستگاه می‌ماند
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(LAST_PAIR_KEY) || "null");
      if (
        saved?.from &&
        saved?.to &&
        (saved.from === TOMAN || bySymbol.has(saved.from)) &&
        (saved.to === TOMAN || bySymbol.has(saved.to))
      ) {
        setFrom(saved.from);
        setTo(saved.to);
      }
    } catch {
      /* — */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPair = (nextFrom: string, nextTo: string, nextAmt?: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextAmt !== undefined) setAmt(nextAmt);
    try {
      window.localStorage.setItem(LAST_PAIR_KEY, JSON.stringify({ from: nextFrom, to: nextTo }));
    } catch {
      /* — */
    }
  };

  const usdToman = bySymbol.get("USD")?.sell ?? 0;
  const tomanOf = (symbol: string) => {
    if (symbol === TOMAN) return 1;
    const asset = bySymbol.get(symbol);
    if (!asset) return 0;
    return asset.unit === "USD" ? asset.sell * usdToman : asset.sell;
  };
  const nameOf = (symbol: string) => (symbol === TOMAN ? "تومان" : (bySymbol.get(symbol)?.nameFa ?? symbol));
  const iconOf = (symbol: string, size: number) =>
    symbol === TOMAN ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/icons/assets/asset-irt-a.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full shadow-[0_0_0_2px_var(--glass-edge)]"
      />
    ) : bySymbol.has(symbol) ? (
      <AssetIcon rate={bySymbol.get(symbol)!} size={size} />
    ) : null;

  const amount = parseFloat(amt || "0") || 0;
  const fromToman = tomanOf(from);
  const toToman = tomanOf(to);
  const result = fromToman && toToman ? (amount * fromToman) / toToman : 0;
  const unitRate = fromToman && toToman ? fromToman / toToman : 0;

  // کهنگی نرخ از قدیمی‌ترین طرف غیرتومانی
  const staleAt = [from, to]
    .filter((symbol) => symbol !== TOMAN)
    .map((symbol) => bySymbol.get(symbol)?.fetchedAt)
    .filter(Boolean)
    .map((at) => new Date(at as string).getTime())
    .sort()[0];
  const isStale = staleAt ? Date.now() - staleAt > STALE_MS : false;

  const press = (key: (typeof KEYPAD)[number]) => {
    setAmt((current) => {
      if (key === "del") return current.slice(0, -1);
      if (key === ".") return current.includes(".") ? current : `${current || "0"}.`;
      const next = current === "0" ? "" : current;
      if (next.replace(".", "").length >= 12) return current;
      return next + key;
    });
  };

  const choose = (side: "from" | "to", symbol: string) => {
    // انتخاب همان ارزِ طرف دیگر، دو طرف را جابه‌جا می‌کند
    if (side === "from") setPair(symbol, symbol === to ? from : to);
    else setPair(symbol === from ? to : from, symbol);
    setPicker(null);
  };

  // نرخ خیلی کوچک (مثل تومان به دلار) معکوس نمایش داده می‌شود تا عدد معنادار بماند
  const rateFlip = unitRate > 0 && unitRate < 0.01;
  const rateLine = rateFlip
    ? `هر ۱ ${nameOf(to)} = ${convertAmount(1 / unitRate)} ${nameOf(from)}`
    : `هر ۱ ${nameOf(from)} = ${convertAmount(unitRate)} ${nameOf(to)}`;

  const pickButton = (side: "from" | "to") => {
    const symbol = side === "from" ? from : to;
    return (
      <button
        type="button"
        onClick={() => setPicker(side)}
        aria-label={`انتخاب ارز، الان ${nameOf(symbol)}`}
        className="glass-btn inline-flex h-11 items-center gap-2 self-start rounded-pill py-0 pe-2.5 ps-3.5 text-[15px] font-bold"
      >
        {iconOf(symbol, 26)}
        {nameOf(symbol)}
        <ChevronDown className="h-4 w-4 text-sub" />
      </button>
    );
  };

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-32 pt-7 min-[900px]:px-8 min-[900px]:pb-20 min-[900px]:pt-12">
      <div className="text-center">
        <h1 className="text-[25px] font-extrabold leading-tight min-[900px]:text-[34px]">تبدیل</h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-[13px] font-medium text-sub" suppressHydrationWarning>
          <span
            className={`h-2 w-2 rounded-full ${isStale ? "bg-faint" : "bg-green-dot shadow-[0_0_0_4px_rgb(var(--c-green-dot)/.18)]"}`}
            aria-hidden="true"
          />
          {isStale ? `قدیمی · ${timeAgo(new Date(staleAt!).toISOString())}` : "با نرخ لحظه‌ای بازار"} · نرخ تحلیلی قیمت
        </p>
      </div>

      {/* ------------------------- دارم / می‌شود ------------------------- */}
      <section className="card mt-7 rounded-[28px] p-4 min-[900px]:p-6" aria-label="تبدیل">
        <div className="grid gap-3 min-[900px]:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] min-[900px]:items-stretch min-[900px]:gap-4">
          <div className="glass-btn flex min-w-0 flex-col gap-2.5 rounded-[20px] p-4 min-[900px]:p-5" aria-label="مبلغ ورودی">
            <span className="text-[13.5px] font-bold text-sub">دارم</span>
            {/* موبایل: نمایش + کیبورد داخلی؛ دسکتاپ: فیلد واقعی */}
            <span className="tabular block min-h-[44px] break-all text-[clamp(26px,8.5vw,39px)] font-extrabold leading-tight min-[900px]:hidden">
              {amountDisplay(amt)}
              <i className="ms-1 inline-block h-[28px] w-0.5 translate-y-1 animate-pulse bg-brand-mint motion-reduce:animate-none" aria-hidden="true" />
            </span>
            <input
              value={amt === "" ? "" : amountDisplay(amt)}
              onChange={(event) => setAmt(toLatinDigits(event.target.value))}
              inputMode="decimal"
              aria-label="مبلغ"
              className="tabular hidden w-full min-w-0 bg-transparent text-[39px] font-extrabold text-ink outline-none min-[900px]:block"
            />
            <p className="min-h-[21px] text-[13px] font-medium leading-6 text-sub">
              {amount >= 1 ? `${amountInWords(amount)} ${nameOf(from)}` : ""}
            </p>
            {pickButton("from")}
          </div>

          <div className="relative z-[2] -my-5 flex items-center justify-center min-[900px]:my-0">
            <button
              type="button"
              onClick={() => setPair(to, from)}
              aria-label="جابه‌جا کردن دو ارز"
              className="grid h-12 w-12 place-items-center rounded-full border-[3px] border-page bg-brand-cream text-brand shadow-[0_4px_14px_rgba(0,0,0,.25)] transition-transform active:scale-95 min-[900px]:h-[52px] min-[900px]:w-[52px] min-[900px]:border-0"
            >
              <svg
                className="h-[22px] w-[22px] rotate-90 min-[900px]:rotate-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 8h14l-3-3M20 16H6l3 3" />
              </svg>
            </button>
          </div>

          <div className="glass-btn flex min-w-0 flex-col gap-2.5 rounded-[20px] p-4 min-[900px]:p-5" aria-label="نتیجه">
            <span className="text-[13.5px] font-bold text-sub">می‌شود</span>
            <output className="tabular block min-h-[44px] break-all text-[clamp(26px,8.5vw,39px)] font-extrabold leading-tight text-green-dark dark:text-brand-mint" aria-live="polite">
              {convertAmount(result)}
            </output>
            <p className="min-h-[21px] text-[13px] font-medium leading-6 text-sub">
              {result >= 1 ? `${amountInWords(result)} ${nameOf(to)}` : ""}
            </p>
            {pickButton("to")}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-sub min-[900px]:text-[15px]">
            هر ۱ {rateFlip ? nameOf(to) : nameOf(from)} ={" "}
            <b className="tabular font-extrabold text-ink">{convertAmount(rateFlip ? 1 / unitRate : unitRate)}</b>{" "}
            {rateFlip ? nameOf(from) : nameOf(to)}
            {bySymbol.get(from === TOMAN ? to : from) ? (
              <span className="ms-2 text-[11.5px] text-muted" suppressHydrationWarning>
                · ساعت {clock(bySymbol.get(from === TOMAN ? to : from)!.fetchedAt)}
              </span>
            ) : null}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {QUICK.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmt(value)}
                className="glass-btn tabular h-9 rounded-pill px-3.5 text-[13.5px] font-bold"
              >
                {amountDisplay(value)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSharing(true)}
              disabled={!(amount > 0 && result > 0)}
              aria-label="اشتراک‌گذاری تبدیل"
              className="glass-btn grid h-9 w-9 place-items-center rounded-pill disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* کیبورد داخلی موبایل، با ارقام فارسی */}
      <div className="mt-4 grid grid-cols-3 gap-2 min-[900px]:hidden" aria-label="صفحه‌کلید عدد">
        {KEYPAD.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            aria-label={key === "del" ? "پاک کردن آخرین رقم" : key === "." ? "ممیز" : FA_KEY[key]}
            className={`glass-btn grid h-[50px] place-items-center rounded-[14px] font-bold active:scale-[.97] ${
              key === "del" || key === "." ? "text-[16px] text-sub" : "text-[22px]"
            }`}
          >
            {key === "del" ? "⌫" : key === "." ? "٫" : FA_KEY[key]}
          </button>
        ))}
      </div>

      {/* ------------------------ تبدیل‌های پرکاربرد ------------------------ */}
      <section className="mt-8 hidden min-[600px]:block">
        <h2 className="mb-3 text-[16px] font-extrabold">تبدیل‌های پرکاربرد</h2>
        <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4">
          {PAIRS.filter((pair) => (pair.from === TOMAN || bySymbol.has(pair.from)) && (pair.to === TOMAN || bySymbol.has(pair.to))).map(
            (pair) => (
              <button
                key={pair.title}
                type="button"
                onClick={() => setPair(pair.from, pair.to, "1")}
                className="card flex items-center gap-2.5 rounded-[18px] p-3.5 text-right"
              >
                <span className="flex shrink-0">
                  {iconOf(pair.from, 26)}
                  <span className="-ms-2 flex">{iconOf(pair.to, 26)}</span>
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-[13.5px] font-extrabold">{pair.title}</b>
                  <span className="tabular block text-[12px] text-sub">
                    ۱ = {convertAmount(tomanOf(pair.from) / tomanOf(pair.to))}
                  </span>
                </span>
              </button>
            ),
          )}
        </div>
      </section>

      <p className="mt-6 text-center text-[12.5px] leading-6 text-sub">
        عددها تخمینی‌اند و بر اساس نرخ تحلیلی قیمت؛ نرخ خرید و فروش صرافی‌ها ممکن است فرق کند.
      </p>

      {picker ? (
        <AssetPicker
          assets={assets.filter((asset) => asset.featured !== false)}
          exclude={[]}
          extraOptions={[{ symbol: TOMAN, label: "تومان" }]}
          title={picker === "from" ? "چه چیزی داری؟" : "به چه چیزی تبدیل شود؟"}
          onSelect={(symbol) => choose(picker, symbol)}
          onClose={() => setPicker(null)}
        />
      ) : null}

      {sharing ? (
        <ShareDialog
          conversion={{
            amount: amountDisplay(amt),
            fromName: nameOf(from),
            toName: nameOf(to),
            result: convertAmount(result),
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
