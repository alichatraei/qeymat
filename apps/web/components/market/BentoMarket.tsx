"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fa, jalali, timeAgo } from "@qeymat/shared";
import AssetIcon from "./AssetIcon";
import { bentoChange, bentoPrice, directionOf } from "./marketFormat";
import type { MarketSnapshot, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

type TileSize = "sm" | "md" | "lg";
type LayoutItem = { assetId: string; size: TileSize };

const STORAGE_KEY = "qeymat.market.bento.v1";
const NEXT_SIZE: Record<TileSize, TileSize> = { sm: "md", md: "lg", lg: "sm" };
const SIZE_LABEL: Record<TileSize, string> = { sm: "کوچک", md: "متوسط", lg: "بزرگ" };

/** چیدمان پیش‌فرض بنتو، مطابق آرت‌برد نهایی دیزاین */
const DEFAULT_LAYOUT: LayoutItem[] = [
  { assetId: "USD", size: "lg" },
  { assetId: "EMAMI", size: "md" },
  { assetId: "BTC", size: "md" },
  { assetId: "EUR", size: "sm" },
  { assetId: "GOLD18", size: "sm" },
  { assetId: "USDT", size: "sm" },
  { assetId: "AED", size: "sm" },
  { assetId: "GBP", size: "sm" },
  { assetId: "HALF", size: "sm" },
  { assetId: "ETH", size: "sm" },
  { assetId: "OUNCE", size: "sm" },
  { assetId: "BRENT", size: "sm" },
];

/** شاخص‌های قابل‌افزودن در سینی (علاوه بر هر چیزی که از چیدمان حذف شود) */
const TRAY_POOL = [
  "USD", "EUR", "AED", "GBP", "TRY", "CAD", "GOLD18", "GOLD24", "EMAMI", "HALF", "QUARTER",
  "BAHAR", "ABSHODEH", "OUNCE", "USDT", "BTC", "ETH", "TON", "SOL", "XAG", "BRENT", "WTI", "NATGAS",
];

const TABS: { id: string; label: string; mobileLabel: string; icon: React.ReactNode }[] = [
  {
    id: "PICKS",
    label: "منتخب من",
    mobileLabel: "همه",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "CURRENCY",
    label: "ارز",
    mobileLabel: "ارز",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v5M18 9.5v5" />
      </svg>
    ),
  },
  {
    id: "GOLD",
    label: "طلا و سکه",
    mobileLabel: "طلا و سکه",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 19l2.5-5h6l2.5 5z" /><path d="M10.5 19l2.5-5h6l2.5 5z" /><path d="M7 14l2.5-5h6L18 14" />
      </svg>
    ),
  },
  {
    id: "CRYPTO",
    label: "رمزارز",
    mobileLabel: "رمزارز",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4z" />
        <path d="M10 8.5h3.2a1.8 1.8 0 0 1 0 3.5H10zM10 12h3.7a1.9 1.9 0 0 1 0 3.7H10zM10 8.5v7.2" />
      </svg>
    ),
  },
  {
    id: "COMMODITY",
    label: "کالا و انرژی",
    mobileLabel: "انرژی",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
      </svg>
    ),
  },
];

function readStored(platform: "web" | "mobile"): LayoutItem[] | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    const items = parsed?.[platform];
    if (!Array.isArray(items)) return null;
    return items.filter((item) => item?.assetId && ["sm", "md", "lg"].includes(item?.size));
  } catch {
    return null;
  }
}

function writeStored(platform: "web" | "mobile", items: LayoutItem[]) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") ?? {};
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, [platform]: items }));
  } catch {
    /* حالت خصوصی مرورگر */
  }
}

/** نقاط اسپارک‌لاین را به مختصات نمودار پس‌زمینه (۲۰۰×۶۰) تبدیل می‌کند */
function sparkPoints(values: number[] | undefined): string | null {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = (200 * index) / (values.length - 1);
      const y = 52 - ((value - min) / span) * 44;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function BentoMarket({ initialSnapshot }: { initialSnapshot: MarketSnapshot }) {
  const params = useSearchParams();
  const [tab, setTab] = useState("PICKS");
  const [view, setView] = useState<"bento" | "list">("bento");
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [search, setSearch] = useState("");
  const [removed, setRemoved] = useState<{ item: LayoutItem; index: number } | null>(null);
  const platform = useRef<"web" | "mobile">("web");
  const loggedIn = useRef(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBox = useRef<HTMLInputElement>(null);

  const { data } = useSWR<MarketSnapshot>("/api/public/rates", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
  const snapshot = data ?? initialSnapshot;
  const bySymbol = useMemo(() => new Map(snapshot.assets.map((asset) => [asset.symbol, asset])), [snapshot.assets]);

  // چیدمان ذخیره‌شده: اول دستگاه، بعد سرور (برای کاربر واردشده سرور برنده است)
  useEffect(() => {
    platform.current = window.matchMedia("(max-width: 899px)").matches ? "mobile" : "web";
    const local = readStored(platform.current);
    if (local?.length) setLayout(local);
    fetch("/api/me/market-layout")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload) return;
        loggedIn.current = true;
        const server = payload.layout?.[platform.current];
        if (Array.isArray(server) && server.length) setLayout(server);
      })
      .catch(() => {});
    if (params.get("view") === "edit") setEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // میان‌بر «/» برای جستجو (دسکتاپ)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        searchBox.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const persist = useCallback((items: LayoutItem[]) => {
    setLayout(items);
    writeStored(platform.current, items);
    if (loggedIn.current) {
      fetch("/api/me/market-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platform.current, items }),
      }).catch(() => {});
    }
  }, []);

  /* ------------------------- فهرست نمایش جاری ------------------------- */
  const term = search.trim().toLowerCase();
  const picksMode = tab === "PICKS" && !term;
  const tiles: { asset: RateView; size: TileSize }[] = useMemo(() => {
    if (term) {
      return snapshot.assets
        .filter((asset) => `${asset.nameFa} ${asset.symbol} ${asset.nameEn}`.toLowerCase().includes(term))
        .slice(0, 24)
        .map((asset) => ({ asset, size: "sm" as TileSize }));
    }
    if (tab === "PICKS") {
      return layout
        .map((item) => {
          const asset = bySymbol.get(item.assetId);
          return asset ? { asset, size: item.size } : null;
        })
        .filter(Boolean) as { asset: RateView; size: TileSize }[];
    }
    return snapshot.assets
      .filter((asset) => asset.category === tab && asset.featured !== false && !["USD_FARDA", "USD_HERAT"].includes(asset.symbol))
      .map((asset, index) => ({ asset, size: index === 0 ? ("lg" as TileSize) : ("sm" as TileSize) }));
  }, [term, tab, layout, bySymbol, snapshot.assets]);

  /* -------------------------- اسپارک‌لاین‌ها -------------------------- */
  const sparkSymbols = useMemo(
    () => tiles.slice(0, 24).map((tile) => tile.asset.symbol).sort().join(","),
    [tiles],
  );
  const { data: sparkData } = useSWR<{ sparks: Record<string, number[]> }>(
    sparkSymbols ? `/api/public/sparks?symbols=${sparkSymbols}` : null,
    fetcher,
    { refreshInterval: 300000, keepPreviousData: true },
  );
  const sparks = sparkData?.sparks ?? {};

  /* --------------------------- حالت ویرایش --------------------------- */
  const trayItems = useMemo(() => {
    if (!editing) return [];
    const onGrid = new Set(layout.map((item) => item.assetId));
    return TRAY_POOL.filter((symbol) => !onGrid.has(symbol) && bySymbol.has(symbol)).map(
      (symbol) => bySymbol.get(symbol)!,
    );
  }, [editing, layout, bySymbol]);

  const addTile = (symbol: string) => persist([...layout, { assetId: symbol, size: "sm" }]);
  const resizeTile = (symbol: string) =>
    persist(layout.map((item) => (item.assetId === symbol ? { ...item, size: NEXT_SIZE[item.size] } : item)));
  const removeTile = (symbol: string) => {
    if (layout.length <= 1) return;
    const index = layout.findIndex((item) => item.assetId === symbol);
    if (index < 0) return;
    setRemoved({ item: layout[index], index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), 5000);
    persist(layout.filter((item) => item.assetId !== symbol));
  };
  const undoRemove = () => {
    if (!removed) return;
    const next = [...layout];
    next.splice(Math.min(removed.index, next.length), 0, removed.item);
    persist(next);
    setRemoved(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const sizeClass: Record<TileSize, string> = {
    sm: "col-span-2",
    md: "col-span-2 row-span-2",
    lg: "col-span-4 row-span-2",
  };

  const firstLg = tiles.findIndex((tile) => tile.size === "lg");

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-4 min-[900px]:px-8 min-[900px]:pb-16">
      {/* گرادیان‌های مشترک اسپارک‌لاین‌ها */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="spark-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--spark-up))" stopOpacity=".1" />
            <stop offset="1" stopColor="rgb(var(--spark-up))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="spark-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--spark-down))" stopOpacity=".1" />
            <stop offset="1" stopColor="rgb(var(--spark-down))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* ------------------------------ سرصفحه ------------------------------ */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-medium text-sub" suppressHydrationWarning>
            <span className="h-2 w-2 rounded-full bg-green-dot shadow-[0_0_0_4px_rgb(var(--c-green-dot)/.18)]" aria-hidden="true" />
            {jalali()} · {timeAgo(snapshot.updatedAt)}
          </p>
          <h1 className="mt-1 text-[25px] font-extrabold leading-tight min-[900px]:text-[34px]">بازار امروز</h1>
        </div>
        <div className="flex items-center gap-2.5">
          {picksMode || editing ? (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              aria-pressed={editing}
              aria-label={editing ? "پایان ویرایش" : "ویرایش صفحهٔ بازار"}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold transition-colors ${
                editing ? "bg-brand-mint text-brand-deep" : "glass-btn"
              }`}
            >
              {editing ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" />
                </svg>
              )}
              <span className="hidden sm:inline">{editing ? "پایان" : "چیدمان"}</span>
            </button>
          ) : null}
          <div className="glass-btn hidden gap-0.5 rounded-xl p-[3px] min-[900px]:flex" role="group" aria-label="نوع نمایش">
            <button
              type="button"
              aria-pressed={view === "bento"}
              aria-label="نمای کاشی"
              onClick={() => setView("bento")}
              className={`grid h-[34px] w-9 place-items-center rounded-[9px] ${view === "bento" ? "bg-[var(--glass-a)] text-ink" : "text-sub"}`}
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="16" height="7" rx="1.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              aria-label="نمای فهرست"
              onClick={() => setView("list")}
              className={`grid h-[34px] w-9 place-items-center rounded-[9px] ${view === "list" ? "bg-[var(--glass-a)] text-ink" : "text-sub"}`}
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------- فیلتر دسته‌ها --------------------------- */}
      <div className="mt-4 flex items-center justify-between gap-4 border-b-0 min-[900px]:border-b min-[900px]:border-[var(--glass-edge)]">
        <div className="flex gap-1.5 overflow-x-auto pb-3 [scrollbar-width:none] min-[900px]:gap-1 min-[900px]:pb-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="دسته‌ها">
          {TABS.map((item) => {
            const active = tab === item.id && !term;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(item.id);
                  setSearch("");
                  if (item.id !== "PICKS") setEditing(false);
                }}
                className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13.5px] transition-colors min-[900px]:h-12 min-[900px]:rounded-none min-[900px]:bg-transparent min-[900px]:px-3.5 min-[900px]:text-[14.5px] ${
                  active
                    ? "bg-brand-cream font-bold text-brand dark:bg-brand-cream dark:text-brand min-[900px]:!bg-transparent min-[900px]:font-extrabold min-[900px]:!text-ink min-[900px]:after:absolute min-[900px]:after:inset-x-2 min-[900px]:after:-bottom-px min-[900px]:after:h-0.5 min-[900px]:after:rounded-full min-[900px]:after:bg-green-dot min-[900px]:after:content-['']"
                    : "glass-btn font-medium text-sub min-[900px]:border-0 min-[900px]:!bg-transparent min-[900px]:!backdrop-filter-none hover:text-ink"
                }`}
              >
                {item.icon}
                <span className="min-[900px]:hidden">{item.mobileLabel}</span>
                <span className="hidden min-[900px]:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
        <label className="hidden h-[42px] w-[280px] shrink-0 items-center gap-2 rounded-xl glass-btn px-3.5 text-sub min-[900px]:flex">
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={searchBox}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجوی ارز، طلا یا رمزارز"
            aria-label="جستجوی شاخص"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
          />
          <span className="rounded-md border border-[var(--glass-btn-edge)] px-1.5 text-[11px]" aria-hidden="true">/</span>
        </label>
      </div>

      {/* ------------------------- سینی افزودن ------------------------- */}
      {editing && picksMode ? (
        <div className="mt-4 rounded-2xl border border-dashed border-brand-mint/50 bg-[var(--glass-btn)] p-3.5" aria-label="افزودن شاخص">
          <h3 className="mb-2.5 text-[13px] font-bold text-green-dark dark:text-brand-mint">افزودن به صفحهٔ اصلی</h3>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trayItems.length ? (
              trayItems.map((asset) => (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => addTile(asset.symbol)}
                  aria-label={`افزودن ${asset.nameFa}`}
                  className="glass-tile flex h-10 shrink-0 items-center gap-2 rounded-pill py-0 pe-1.5 ps-3 text-[13px] font-bold"
                >
                  <AssetIcon rate={asset} size={22} />
                  {asset.nameFa}
                  <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-brand-mint text-brand-deep" aria-hidden="true">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
              ))
            ) : (
              <span className="text-[13px] text-sub">همهٔ شاخص‌ها روی صفحه هستند.</span>
            )}
          </div>
        </div>
      ) : null}

      {/* ------------------------------- گرید ------------------------------- */}
      {view === "list" && !editing ? (
        <ul className="mt-4 space-y-2">
          {tiles.map(({ asset }) => {
            const direction = directionOf(asset.changePercent);
            const price = bentoPrice(asset.sell, asset.unit);
            return (
              <li key={asset.symbol}>
                <Link
                  href={`/${asset.symbol.toLowerCase()}`}
                  className="glass-tile flex items-center gap-3 rounded-2xl px-4 py-3 no-underline"
                >
                  <AssetIcon rate={asset} size={30} />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{asset.nameFa}</span>
                  <span className="tabular text-[16px] font-extrabold">
                    {price.num}
                    <small className="ms-1 text-[12px] font-medium text-sub">{price.unit}</small>
                  </span>
                  <ChangeChip direction={direction} change={asset.changePercent} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 grid auto-rows-[88px] grid-flow-dense grid-cols-4 gap-2.5 min-[900px]:auto-rows-[104px] min-[900px]:grid-cols-8 min-[900px]:gap-3.5">
          {tiles.map(({ asset, size }, index) => (
            <BentoTile
              key={asset.symbol}
              asset={asset}
              size={size}
              hero={index === firstLg && size === "lg"}
              spark={sparks[asset.symbol]}
              editing={editing && picksMode}
              sizeClass={sizeClass[size]}
              onRemove={() => removeTile(asset.symbol)}
              onResize={() => resizeTile(asset.symbol)}
            />
          ))}
          {!tiles.length ? (
            <p className="col-span-full py-14 text-center text-[13px] text-sub">نتیجه‌ای پیدا نشد.</p>
          ) : null}
        </div>
      )}

      <p className="mt-6 flex items-center justify-between gap-3 text-[12px] text-muted">
        <span>به تومان مگر ذکر شده · تغییر نسبت به دیروز · لمس برای جزئیات</span>
        <span dir="ltr" className="font-mono text-[11px]">qeymat.online</span>
      </p>

      {/* ---------------------- توست بازگردانی حذف ---------------------- */}
      {removed ? (
        <div className="fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-50 flex justify-center xl:bottom-8" role="status">
          <div className="glass-tile flex items-center gap-3 rounded-pill py-2 pe-2 ps-4 text-[13px] font-bold">
            حذف شد
            <button type="button" onClick={undoRemove} className="rounded-pill bg-brand-mint px-3 py-1.5 text-[12px] font-bold text-brand-deep">
              بازگردانی
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ChangeChip({ direction, change, large = false }: { direction: "up" | "down" | "flat"; change: number; large?: boolean }) {
  const up = direction !== "down";
  return (
    <span
      className={`tabular inline-flex items-center gap-1 rounded-pill font-extrabold ${
        large ? "h-[30px] px-3 text-[14px] min-[900px]:h-8 min-[900px]:px-3.5 min-[900px]:text-[15px]" : "h-6 px-2 text-[12px] min-[900px]:h-[26px] min-[900px]:px-2.5 min-[900px]:text-[13px]"
      }`}
      style={{
        background: up ? "var(--chip-up-bg)" : "var(--chip-down-bg)",
        color: up ? "rgb(var(--spark-up))" : "rgb(var(--spark-down))",
      }}
    >
      <span aria-hidden="true" className="text-[9px]">{direction === "down" ? "▼" : direction === "up" ? "▲" : "—"}</span>
      {bentoChange(change)}
    </span>
  );
}

function BentoTile({
  asset,
  size,
  hero,
  spark,
  editing,
  sizeClass,
  onRemove,
  onResize,
}: {
  asset: RateView;
  size: TileSize;
  hero: boolean;
  spark?: number[];
  editing: boolean;
  sizeClass: string;
  onRemove: () => void;
  onResize: () => void;
}) {
  const direction = directionOf(asset.changePercent);
  const price = bentoPrice(asset.sell, asset.unit);
  const points = sparkPoints(spark);
  const up = direction !== "down";
  const label = `${asset.nameFa} ${price.num} ${price.unit}`;

  const priceSize =
    size === "lg"
      ? "text-[49px] leading-[1.05] min-[900px]:text-[61px]"
      : size === "md"
        ? "text-[25px] min-[900px]:text-[31px]"
        : "text-[20px] min-[900px]:text-[22px]";

  return (
    <div
      className={`glass-tile relative flex flex-col justify-between overflow-hidden rounded-[20px] px-3.5 py-3 transition-transform duration-[120ms] min-[900px]:rounded-[22px] min-[900px]:px-[18px] min-[900px]:py-4 ${
        size === "lg" ? "p-[18px] px-5 min-[900px]:px-7 min-[900px]:py-6" : ""
      } ${sizeClass} ${editing ? "outline-dashed outline-[1.5px] -outline-offset-[1.5px] outline-brand-mint/60" : "hover:-translate-y-0.5"}`}
    >
      {!editing ? (
        <Link href={`/${asset.symbol.toLowerCase()}`} className="absolute inset-0 z-[2] rounded-[20px]" aria-label={label} />
      ) : (
        <>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`حذف ${asset.nameFa} از صفحه`}
            className="absolute end-2 top-2 z-[3] grid h-[30px] w-[30px] place-items-center rounded-full border border-danger/40 bg-danger-soft text-danger-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onResize}
            aria-label={`تغییر اندازهٔ ${asset.nameFa}، الان ${SIZE_LABEL[size]}`}
            className="absolute end-11 top-2 z-[3] inline-flex h-[30px] items-center gap-1 rounded-pill bg-brand-cream px-2.5 text-[12px] font-bold text-brand"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
            </svg>
            {SIZE_LABEL[size]}
          </button>
        </>
      )}

      {hero ? (
        <svg className="pointer-events-none absolute end-3.5 top-3 h-14 w-14 min-[900px]:end-5 min-[900px]:top-4 min-[900px]:h-16 min-[900px]:w-16" viewBox="8 8 48 48" aria-hidden="true">
          <path d="M45.86 37.90 A17.5 17.5 0 1 0 29.39 47.99 L29.65 40.49 A10 10 0 1 1 39.06 34.73 Z" fill="var(--wm-fill,rgb(var(--c-ink)/.1))" stroke="rgb(var(--c-ink)/.25)" strokeWidth=".6" />
          <path d="M28.39 47.88 L28.39 34.30 L29.39 33.70 L35.79 28.90 L35.79 47.01 A17.5 17.5 0 0 1 28.39 47.88 Z" fill="rgb(var(--c-ink)/.1)" stroke="rgb(var(--c-ink)/.25)" strokeWidth=".6" />
          <rect x="41.2" y="43.2" width="6.2" height="6.2" rx="1.3" fill="rgb(var(--c-brand-mint)/.3)" />
        </svg>
      ) : null}

      {points ? (
        <svg className="pointer-events-none absolute inset-x-0 top-[26%] h-[44%] w-full" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={`${points} 200,60 0,60`} fill={`url(#spark-${up ? "up" : "down"})`} />
          <polyline
            points={points}
            fill="none"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="opacity-[.42]"
            stroke={up ? "rgb(var(--spark-up))" : "rgb(var(--spark-down))"}
          />
        </svg>
      ) : null}

      <span className="relative flex items-center gap-2">
        <AssetIcon rate={asset} size={size === "lg" ? 40 : 28} />
        <span className={`halo min-w-0 flex-1 truncate font-bold leading-[1.3] ${size === "lg" ? "text-[18px] min-[900px]:text-[20px]" : "text-[14px] min-[900px]:text-[15px]"}`}>
          {asset.nameFa}
        </span>
      </span>
      <span className="relative flex flex-wrap items-center justify-between gap-1.5">
        <span className="min-w-0">
          <span className={`halo tabular font-extrabold ${priceSize}`}>{price.num}</span>
          <span className={`ms-1 font-medium text-sub ${size === "lg" ? "text-[14px] min-[900px]:text-[16px]" : "text-[12px] min-[900px]:text-[13px]"}`}>
            {price.unit}
          </span>
        </span>
        <ChangeChip direction={direction} change={asset.changePercent} large={size === "lg"} />
      </span>
    </div>
  );
}
