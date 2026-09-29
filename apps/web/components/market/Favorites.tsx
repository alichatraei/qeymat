"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Check, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import { CATEGORY_TABS, fa } from "@qeymat/shared";
import RateCard from "./RateCard";
import RateIcon from "./RateIcon";
import type { RateView } from "@/lib/types";

const STORAGE_KEY = "qeymat:favorites:v1";
/** ترکیب پیش‌فرض صفحه‌ی اول: از هر بازار یکی دو دارایی پرطرفدار */
export const DEFAULT_FAVORITES = ["USDT", "BTC", "GOLD18", "EMAMI", "BRENT", "EUR"];

function readFavorites(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : null;
  } catch {
    return null;
  }
}

function writeFavorites(symbols: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    /* حالت خصوصی مرورگر: فقط تا بستن صفحه می‌ماند */
  }
}

/**
 * «منتخب من» — ترکیبی از ارز، طلا، رمزارز و کالا که کاربر خودش می‌چیند.
 * فهرست روی همین دستگاه ذخیره می‌شود. روی گوشی با نگه داشتن و کشیدن،
 * با موس با کشیدن جابه‌جا می‌شود.
 */
export default function Favorites({ assets, onOpen }: { assets: RateView[]; onOpen: (rate: RateView) => void }) {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_FAVORITES);
  const [editing, setEditing] = useState(false);
  // کلیکی که بلافاصله بعد از رها کردن کارت می‌آید نباید جزئیات را باز کند
  const justDragged = useRef(false);

  useEffect(() => {
    const saved = readFavorites();
    if (saved) setSymbols(saved);
  }, []);

  const update = (next: string[]) => {
    setSymbols(next);
    writeFavorites(next);
  };

  const bySymbol = useMemo(() => new Map(assets.map((asset) => [asset.symbol, asset])), [assets]);
  // دارایی‌ای که فعلاً نرخ ندارد (یا حذف شده) جای خالی نمی‌گیرد
  const visible = symbols.map((symbol) => bySymbol.get(symbol)).filter(Boolean) as RateView[];

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // لمس: نگه داشتن کوتاه تا اسکرول صفحه با کشیدن کارت اشتباه نشود
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setTimeout(() => (justDragged.current = false), 0);
    if (!over || active.id === over.id) return;
    const from = symbols.indexOf(String(active.id));
    const to = symbols.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    update(arrayMove(symbols, from, to));
  };

  return (
    <section className="content-width pt-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-[-.4px]">منتخب من</h2>
          <p className="mt-1 text-[11.5px] text-muted">
            {visible.length > 1 ? "برای جابه‌جایی، کارت را نگه دارید و بکشید" : "دارایی‌های دلخواهتان را اضافه کنید"}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="btn-ghost h-10 min-h-0 shrink-0">
          <Pencil />
          ویرایش
        </button>
      </div>

      {visible.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => (justDragged.current = true)}
          onDragEnd={onDragEnd}
          onDragCancel={() => setTimeout(() => (justDragged.current = false), 0)}
        >
          <SortableContext items={visible.map((rate) => rate.symbol)} strategy={rectSortingStrategy}>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {visible.map((rate) => (
                <SortableCard
                  key={rate.symbol}
                  rate={rate}
                  onOpen={() => {
                    if (!justDragged.current) onOpen(rate);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 flex h-24 w-full items-center justify-center gap-2 rounded-card border border-dashed border-line-strong text-[12.5px] font-semibold text-sub hover:text-ink"
        >
          <Plus className="h-4 w-4" />
          افزودن به منتخب
        </button>
      )}

      {editing ? (
        <FavoritesPicker
          assets={assets}
          selected={symbols}
          onChange={update}
          onReset={() => update(DEFAULT_FAVORITES)}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </section>
  );
}

function SortableCard({ rate, onOpen }: { rate: RateView; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rate.symbol });
  return (
    <RateCard
      ref={setNodeRef}
      rate={rate}
      onOpen={onOpen}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // جلوی منوی لمس طولانی و انتخاب متن گوشی را می‌گیرد تا کشیدن روان باشد
      className={`touch-manipulation select-none [-webkit-touch-callout:none] ${
        isDragging ? "relative z-10 scale-[1.04] shadow-drawer" : ""
      }`}
      {...attributes}
      {...listeners}
    />
  );
}

function FavoritesPicker({
  assets,
  selected,
  onChange,
  onReset,
  onClose,
}: {
  assets: RateView[];
  selected: string[];
  onChange: (symbols: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const term = search.trim().toLowerCase();
  const groups = CATEGORY_TABS.map((tab) => ({
    ...tab,
    items: assets.filter(
      (asset) =>
        asset.category === tab.id &&
        (term
          ? `${asset.nameFa} ${asset.symbol} ${asset.nameEn}`.toLowerCase().includes(term)
          : asset.featured !== false || selected.includes(asset.symbol)),
    ),
  })).filter((group) => group.items.length);

  const toggle = (symbol: string) =>
    onChange(selected.includes(symbol) ? selected.filter((item) => item !== symbol) : [...selected, symbol]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="ویرایش منتخب">
      <button type="button" className="absolute inset-0 animate-fade-in bg-overlay/45 backdrop-blur-[2px]" onClick={onClose} aria-label="بستن" />
      <div className="relative flex max-h-[88vh] w-full max-w-[480px] animate-rise-in flex-col rounded-t-[28px] bg-surface shadow-drawer sm:rounded-[28px]">
        <div className="flex shrink-0 items-center justify-between px-5 pt-5">
          <span>
            <strong className="block text-[14px]">ویرایش منتخب</strong>
            <small className="text-[11px] text-muted">{fa(selected.length)} دارایی انتخاب شده</small>
          </span>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-sub hover:bg-soft" aria-label="بستن">
            <X className="h-[17px] w-[17px]" />
          </button>
        </div>

        <label className="mx-5 mt-4 flex h-11 shrink-0 items-center gap-2.5 rounded-control border border-line bg-field px-3.5 text-faint">
          <Search className="h-[16px] w-[16px]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجوی ارز، طلا، رمزارز، کالا…"
            className="w-full border-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-faint"
            aria-label="جست‌وجوی دارایی"
          />
        </label>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          {groups.map((group) => (
            <div key={group.id} className="mt-3">
              <h3 className="mb-1.5 text-[11px] font-bold text-muted">{group.label}</h3>
              <div className="space-y-1">
                {group.items.map((asset) => {
                  const on = selected.includes(asset.symbol);
                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => toggle(asset.symbol)}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-right transition-colors ${
                        on ? "border-green/30 bg-green-soft" : "border-transparent hover:bg-soft"
                      }`}
                    >
                      <RateIcon rate={asset} size="small" />
                      <strong className="flex-1 truncate text-[12.5px]">{asset.nameFa}</strong>
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full border ${
                          on ? "border-green bg-green text-white" : "border-line text-faint"
                        }`}
                      >
                        {on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!groups.length ? <p className="py-10 text-center text-[12px] text-muted">دارایی‌ای پیدا نشد.</p> : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="btn-solid h-11 flex-1">
            <Check />
            تمام
          </button>
          <button type="button" onClick={onReset} className="btn-ghost h-11">
            <RotateCcw />
            پیش‌فرض
          </button>
        </div>
      </div>
    </div>
  );
}
