"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Plus, Search, SlidersHorizontal } from "lucide-react";
import { CATEGORY_TABS, DOLLAR_SYMBOLS, fa, jalali, timeAgo } from "@qeymat/shared";
import AssetCell, { type MarketLayout } from "./AssetCell";
import ViewSwitch from "./ViewSwitch";
import RateDrawer from "./RateDrawer";
import type { AssetCategory, MarketSnapshot, RateView } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

const LAYOUT_KEY = "qeymat.market.layout";
const ORDER_KEY = "qeymat.market.order";
const LEGACY_FAVORITES_KEY = "qeymat:favorites:v1";
const PICKS = "PICKS";

/** ترکیب پیش‌فرض «منتخب من»؛ خانهٔ اول ویژه است */
const DEFAULT_PICKS = ["USD", "GOLD18", "EMAMI", "USDT", "EUR", "BTC", "ABSHODEH", "AED", "BRENT"];
const PICK_SUGGESTIONS = ["USD", "GOLD18", "EMAMI", "USDT", "EUR", "BTC"];

type OrderMap = Record<string, string[]>;

function readLayout(): MarketLayout {
  try {
    const value = window.localStorage.getItem(LAYOUT_KEY);
    return value === "circle" || value === "dial" ? value : "square";
  } catch {
    return "square";
  }
}

function readOrders(): OrderMap {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ORDER_KEY) || "null");
    if (parsed && typeof parsed === "object") return parsed as OrderMap;
  } catch {
    /* حالت خصوصی مرورگر */
  }
  // منتخب قدیمی (قبل از فاز ۲) به کلید جدید منتقل می‌شود
  try {
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_FAVORITES_KEY) || "null");
    if (Array.isArray(legacy) && legacy.length) return { [PICKS]: legacy.filter((s) => typeof s === "string") };
  } catch {
    /* — */
  }
  return {};
}

function writeOrders(orders: OrderMap) {
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
  } catch {
    /* — */
  }
}

export default function MarketBoard({
  initialSnapshot,
  initialCategory = "CURRENCY",
}: {
  initialSnapshot: MarketSnapshot;
  initialCategory?: AssetCategory;
}) {
  const params = useSearchParams();
  const [layout, setLayout] = useState<MarketLayout>("square");
  const [layoutTick, setLayoutTick] = useState(0);
  const [category, setCategory] = useState<string>(initialCategory);
  const [categoryTick, setCategoryTick] = useState(0);
  const [orders, setOrders] = useState<OrderMap>({});
  const [editing, setEditing] = useState(false);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RateView | null>(null);
  const justDragged = useRef(false);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, mutate } = useSWR<MarketSnapshot>("/api/public/rates", fetcher, {
    fallbackData: initialSnapshot,
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
  const snapshot = data ?? initialSnapshot;

  // نمای ذخیره‌شده بعد از mount خوانده می‌شود تا SSR با کلاینت یکی بماند
  useEffect(() => {
    setLayout(readLayout());
    setOrders(readOrders());
  }, []);

  const bySymbol = useMemo(() => new Map(snapshot.assets.map((asset) => [asset.symbol, asset])), [snapshot.assets]);

  // باز کردن جزئیات از لینک بیرونی: /?symbol=USD (آیتم‌های ticker)
  useEffect(() => {
    const symbol = params.get("symbol");
    if (symbol && bySymbol.has(symbol.toUpperCase())) setSelected(bySymbol.get(symbol.toUpperCase()) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const tabs = useMemo(() => {
    const present = CATEGORY_TABS.filter((tab) => snapshot.assets.some((asset) => asset.category === tab.id));
    return [{ id: PICKS, label: "منتخب من" }, ...present];
  }, [snapshot.assets]);

  /** فهرست نمادهای یک دسته با ترتیب ذخیره‌شدهٔ کاربر */
  const symbolsOf = useCallback(
    (cat: string): string[] => {
      const base =
        cat === PICKS
          ? (orders[PICKS] ?? DEFAULT_PICKS).filter((symbol) => bySymbol.has(symbol))
          : snapshot.assets
              .filter(
                (asset) =>
                  asset.category === cat &&
                  asset.featured !== false &&
                  // فردایی و هرات داخل جزئیات دلارند، نه در شبکه؛ خود دلار اول فهرست است
                  !(cat === "CURRENCY" && DOLLAR_SYMBOLS.includes(asset.symbol) && asset.symbol !== "USD"),
              )
              .map((asset) => asset.symbol);
      if (cat === PICKS) return base;
      const saved = orders[cat];
      if (!saved) return base;
      const inSaved = saved.filter((symbol) => base.includes(symbol));
      const added = base.filter((symbol) => !inSaved.includes(symbol));
      return [...inSaved, ...added];
    },
    [orders, snapshot.assets, bySymbol],
  );

  const list = useMemo(
    () => symbolsOf(category).map((symbol) => bySymbol.get(symbol)).filter(Boolean) as RateView[],
    [symbolsOf, category, bySymbol],
  );

  const searchRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return null;
    return snapshot.assets.filter((asset) =>
      `${asset.nameFa} ${asset.symbol} ${asset.nameEn}`.toLowerCase().includes(term),
    );
  }, [search, snapshot.assets]);

  const changeLayout = (next: MarketLayout) => {
    if (next === layout) return;
    setLayout(next);
    setLayoutTick((tick) => tick + 1);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* — */
    }
  };

  const saveOrder = (cat: string, symbols: string[]) => {
    const next = { ...orders, [cat]: symbols };
    setOrders(next);
    writeOrders(next);
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    saveOrder(category, arrayMove(symbolsOf(category), from, to));
    setPickedIndex(null);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setTimeout(() => (justDragged.current = false), 0);
    if (!over || active.id === over.id) return;
    const symbols = symbolsOf(category);
    move(symbols.indexOf(String(active.id)), symbols.indexOf(String(over.id)));
  };

  /** نگه داشتن ۴۸۰ms روی هر خانه، حالت چیدمان را باز می‌کند */
  const pressHandlers = (index: number) =>
    editing
      ? {}
      : {
          onPointerDown: () => {
            longPress.current = setTimeout(() => {
              longPress.current = null;
              try {
                navigator.vibrate?.(10);
              } catch {
                /* — */
              }
              setEditing(true);
              setPickedIndex(index);
            }, 480);
          },
          onPointerUp: () => {
            if (longPress.current) clearTimeout(longPress.current);
          },
          onPointerLeave: () => {
            if (longPress.current) clearTimeout(longPress.current);
          },
        };

  const activate = (rate: RateView, index: number) => {
    if (justDragged.current) return;
    if (editing) {
      if (pickedIndex === null) setPickedIndex(index);
      else if (pickedIndex === index) setPickedIndex(null);
      else move(pickedIndex, index);
      return;
    }
    setSelected(rate);
  };

  const addPick = (symbol: string) => {
    const current = (orders[PICKS] ?? []).filter((item) => bySymbol.has(item));
    saveOrder(PICKS, [...current, symbol]);
  };

  const featured = list[0];
  const rest = list.slice(1);
  const emptyPicks = category === PICKS && list.length === 0;
  const isSquare = layout === "square";

  const gridClass = isSquare
    ? "grid grid-cols-2 gap-3 sm:grid-cols-3 min-[1000px]:grid-cols-5"
    : "grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 min-[1000px]:grid-cols-5";
  const featuredClass = isSquare
    ? "col-span-2 min-[1000px]:row-span-2 min-[1000px]:[&>button]:h-full"
    : "col-span-2 flex items-start justify-center py-1 sm:col-span-2 min-[1000px]:row-span-2 min-[1000px]:items-center";

  return (
    <main className="content-width pb-24 pt-5">
      {/* ------------------------------ سرصفحه ------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2.5 text-[25px] font-extrabold tracking-[-.5px]">
          بازار
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-[2px] bg-green-dot" role="img" aria-label="قیمت‌ها زنده‌اند" />
        </h1>
        <span className="text-[12px] text-muted">{jalali()}</span>
        <span className="mr-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => mutate()}
            className="hidden items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink sm:inline-flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-dot" aria-hidden="true" />
            <span suppressHydrationWarning>زنده · {timeAgo(snapshot.updatedAt)}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing((value) => !value);
              setPickedIndex(null);
            }}
            aria-pressed={editing}
            className={`inline-flex h-[42px] items-center gap-1.5 rounded-control border px-3 text-[12px] font-bold transition-colors ${
              editing ? "border-ink bg-ink text-page" : "border-line bg-surface text-sub hover:text-ink"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            چیدمان
          </button>
          <ViewSwitch value={layout} onChange={changeLayout} />
        </span>
      </div>

      {/* ------------------------- جست‌وجو + دسته‌ها ------------------------- */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        {editing ? (
          <div className="flex min-h-[46px] flex-1 items-center justify-between gap-3 rounded-control border border-line bg-surface px-4" role="status">
            <span className="flex flex-col py-1.5">
              <b className="text-[13.5px]">چیدمان</b>
              <span className="text-[11px] text-muted">بکش یا دو خانه را پشت هم لمس کن · خانهٔ اول ویژه است</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setPickedIndex(null);
              }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] bg-brand px-3.5 text-[12px] font-bold text-brand-cream dark:bg-brand-mint dark:text-brand-deep"
            >
              <Check className="h-4 w-4" />
              تمام
            </button>
          </div>
        ) : (
          <>
            <div className="seg-tabs flex min-w-0 flex-1 gap-0.5 overflow-x-auto border-b border-line" role="tablist" aria-label="دسته‌ها">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={category === tab.id && !searchRows}
                  onClick={() => {
                    setCategory(tab.id);
                    setCategoryTick((tick) => tick + 1);
                    setSearch("");
                    setPickedIndex(null);
                  }}
                  className={`-mb-px inline-flex min-h-[46px] shrink-0 items-center gap-1.5 border-b-2 px-3 text-[14px] font-bold transition-colors ${
                    category === tab.id && !searchRows ? "border-ink text-ink" : "border-transparent text-muted hover:text-sub"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <label className="flex h-11 w-full items-center gap-2.5 rounded-control border border-line bg-field px-3.5 text-faint md:w-[280px]">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجوی ارز، طلا یا رمزارز"
                className="w-full border-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-faint"
                aria-label="جست‌وجوی دارایی"
              />
            </label>
          </>
        )}
      </div>

      {/* ------------------------------- شبکه ------------------------------- */}
      {searchRows ? (
        searchRows.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 min-[1000px]:grid-cols-5">
            {searchRows.map((rate) => (
              <AssetCell key={rate.symbol} rate={rate} layout="square" onActivate={() => setSelected(rate)} />
            ))}
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-line py-14 text-center">
            <Search className="h-6 w-6 text-faint" />
            <strong className="text-[13px]">نتیجه‌ای برای «{search.trim()}» پیدا نشد</strong>
            <span className="text-[11.5px] text-muted">نماد را امتحان کن، مثلاً GBP.</span>
          </div>
        )
      ) : emptyPicks ? (
        <>
          <div className="mt-5 flex flex-col items-center gap-2.5 rounded-[24px] border border-dashed border-line-strong bg-surface p-7 text-center">
            <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" className="overflow-visible">
              <path d="M18.93 16A8 8 0 1 0 16 18.93" fill="none" stroke="rgb(var(--c-line-strong))" strokeWidth="1.6" strokeLinecap="round" />
              <rect x="16.6" y="16.6" width="4" height="4" rx="0.9" fill="rgb(var(--c-icon-dot))" className="dot-pulse" />
            </svg>
            <b className="text-[16px]">منتخبت هنوز خالیه</b>
            <span className="text-[13px] text-sub">هر چه این‌جا بزنی، اولین‌شان بزرگ بالای صفحه می‌نشیند.</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 min-[1000px]:grid-cols-6">
            {PICK_SUGGESTIONS.map((symbol) => {
              const rate = bySymbol.get(symbol);
              if (!rate) return null;
              return (
                <div key={symbol} className="relative">
                  <AssetCell rate={rate} layout="square" onActivate={() => addPick(symbol)} aria-label={`افزودن ${rate.nameFa}`} />
                  <span className="pointer-events-none absolute bottom-3 left-3 grid h-7 w-7 place-items-center rounded-full bg-ink text-page" aria-hidden="true">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <DndContext
          id="market-grid"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => (justDragged.current = true)}
          onDragEnd={onDragEnd}
          onDragCancel={() => setTimeout(() => (justDragged.current = false), 0)}
        >
          <SortableContext items={list.map((rate) => rate.symbol)} strategy={rectSortingStrategy} disabled={!editing}>
            <div key={`${layout}-${layoutTick}-${category}-${categoryTick}`} className={`cells-in mt-4 ${gridClass}`}>
              {featured ? (
                <div className={featuredClass}>
                  <SortableAssetCell
                    rate={featured}
                    layout={layout}
                    featured
                    editing={editing}
                    selected={pickedIndex === 0}
                    onActivate={() => activate(featured, 0)}
                    {...pressHandlers(0)}
                  />
                </div>
              ) : null}
              {rest.map((rate, idx) => (
                <SortableAssetCell
                  key={rate.symbol}
                  rate={rate}
                  layout={layout}
                  editing={editing}
                  selected={pickedIndex === idx + 1}
                  onActivate={() => activate(rate, idx + 1)}
                  {...pressHandlers(idx + 1)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!searchRows && !emptyPicks ? (
        <p className="mt-6 text-center text-[12px] text-muted">به تومان · لمس برای جزئیات · نگه داشتن برای جابه‌جایی</p>
      ) : null}

      {selected ? (
        <RateDrawer
          rate={snapshot.assets.find((asset) => asset.symbol === selected.symbol) ?? selected}
          assets={snapshot.assets}
          onOpen={setSelected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </main>
  );
}

function SortableAssetCell({
  rate,
  ...props
}: {
  rate: RateView;
  layout: MarketLayout;
  featured?: boolean;
  editing?: boolean;
  selected?: boolean;
  onActivate: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rate.symbol,
    disabled: !props.editing,
  });
  return (
    <AssetCell
      ref={setNodeRef}
      rate={rate}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`touch-manipulation select-none [-webkit-touch-callout:none] ${
        isDragging ? "relative z-10 !shadow-[0_0_0_2px_rgb(var(--c-focus-ring))] scale-[.97]" : ""
      }`}
      {...attributes}
      {...listeners}
      {...props}
    />
  );
}
