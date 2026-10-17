"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CATEGORY_TABS } from "@qeymat/shared";
import AssetIcon from "./AssetIcon";
import { formatPrice } from "./PriceChart";
import type { RateView } from "@/lib/types";

/** برگهٔ انتخاب دارایی با جست‌وجو و دسته‌ها؛ در موبایل شیت پایینی است */
export default function AssetPicker({
  extraOptions = [],
  assets,
  exclude,
  title,
  onSelect,
  onClose,
}: {
  /** گزینه‌های مجازی مثل «تومان» که همیشه اول فهرست می‌آیند */
  extraOptions?: { symbol: string; label: string }[];
  assets: RateView[];
  exclude: string[];
  title: string;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("ALL");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = assets.filter((asset) => {
    if (exclude.includes(asset.symbol)) return false;
    if (category !== "ALL" && asset.category !== category) return false;
    const query = term.trim().toLowerCase();
    return query ? `${asset.nameFa} ${asset.symbol} ${asset.nameEn}`.toLowerCase().includes(query) : true;
  });

  return (
    // در موبایل برگه‌ی پایین تمام‌عرض؛ min-w-0 تا ردیف دسته‌ها برگه را از صفحه بیرون نزند
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 animate-fade-in bg-overlay/40" onClick={onClose} aria-label="بستن" />
      <div className="card relative flex max-h-[85vh] w-full min-w-0 max-w-full animate-rise-in flex-col overflow-hidden rounded-b-none pb-[env(safe-area-inset-bottom)] shadow-drawer sm:max-h-[80vh] sm:w-[520px] sm:rounded-b-card sm:pb-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <strong className="text-[14px]">{title}</strong>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-sub hover:bg-tab"
            aria-label="بستن"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="border-b border-line p-3">
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="جست‌وجوی نام یا نماد"
            className="field"
          />
          {/* همان دسته‌بندی صفحه‌ی اول */}
          <div className="table-scroll mt-3 max-w-full">
            <div className="segmented" role="tablist">
              {[{ id: "ALL", label: "همه" }, ...CATEGORY_TABS].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={category === tab.id}
                  data-active={category === tab.id}
                  onClick={() => setCategory(tab.id)}
                  className="min-w-[72px] !h-[36px] !px-3.5 !text-[12px]"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-y-auto p-2">
          {extraOptions
            .filter((option) => !exclude.includes(option.symbol))
            .map((option) => (
              <button
                key={option.symbol}
                type="button"
                onClick={() => onSelect(option.symbol)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-hover"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[23.4%] bg-brand text-[11px] font-extrabold text-brand-cream" aria-hidden="true">
                  ت
                </span>
                <strong className="flex-1 text-[12.5px]">{option.label}</strong>
              </button>
            ))}
          {list.map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelect(asset.symbol)}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-hover"
            >
              <AssetIcon rate={asset} size={28} />
              <span className="flex flex-1 flex-col">
                <strong className="text-[12.5px]">{asset.nameFa}</strong>
                <small dir="ltr" className="text-right text-[10.5px] text-muted">
                  {asset.symbol}
                </small>
              </span>
              <span className="tabular text-[12px] text-sub">{formatPrice(asset.sell)}</span>
            </button>
          ))}
          {!list.length ? <p className="py-10 text-center text-[12px] text-muted">موردی پیدا نشد.</p> : null}
        </div>
      </div>
    </div>
  );
}
