"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { unitLabel } from "@qeymat/shared";
import AssetIcon from "./AssetIcon";
import {
  DIR_ARROW,
  DIR_CLASS,
  directionOf,
  gaugePosition,
  marketChange,
  marketPrice,
} from "./marketFormat";
import type { RateView } from "@/lib/types";

export type MarketLayout = "square" | "circle" | "dial";

/* ---------- هندسهٔ دایره v1 و سنجه v2، دقیقاً مطابق دیزاین ---------- */
const C = 2 * Math.PI * 46;
const TRACK = C * 0.875; // شکاف ۴۵ درجه، هم‌راستای شکاف حلقهٔ Q
const GA0 = 75;
const GSWEEP = 300;
const GR = 44;

const polar = (deg: number, r: number): [number, number] => [
  50 + r * Math.cos((deg * Math.PI) / 180),
  50 + r * Math.sin((deg * Math.PI) / 180),
];

function gaugeArc(p0: number, p1: number, r: number): string {
  const a0 = GA0 + GSWEEP * Math.min(p0, p1);
  const a1 = GA0 + GSWEEP * Math.max(p0, p1);
  const s0 = polar(a0, r);
  const s1 = polar(a1, r);
  return `M${s0[0].toFixed(2)} ${s0[1].toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${s1[0].toFixed(2)} ${s1[1].toFixed(2)}`;
}

/** ۳۱ خط درجه؛ هر پنجمی بلندتر */
let GAUGE_TICKS = "";
for (let i = 0; i <= 30; i += 1) {
  const angle = GA0 + (GSWEEP * i) / 30;
  const from = polar(angle, i % 5 === 0 ? 46.5 : 48);
  const to = polar(angle, 50);
  GAUGE_TICKS += `M${from[0].toFixed(2)} ${from[1].toFixed(2)}L${to[0].toFixed(2)} ${to[1].toFixed(2)}`;
}
const GAUGE_TRACK = gaugeArc(0, 1, GR);
const GAUGE_DOT = polar(45, GR);
const GAUGE_OPEN = polar(GA0 + GSWEEP * 0.5, 40.5);

/** هر تیک قیمت، کلاس چرخش رقم و wash می‌گیرد؛ A/B برای ری‌استارت انیمیشن */
function useRollClass(price: number, direction: ReturnType<typeof directionOf>) {
  const previous = useRef(price);
  const flip = useRef(false);
  const [cls, setCls] = useState("");
  useEffect(() => {
    if (previous.current === price) return;
    const up = price > previous.current;
    previous.current = price;
    flip.current = !flip.current;
    setCls(`roll-${up ? "u" : "d"}${flip.current ? "A" : "B"}`);
  }, [price]);
  return cls || "";
}

type CellProps = {
  rate: RateView;
  layout: MarketLayout;
  featured?: boolean;
  editing?: boolean;
  selected?: boolean;
  onActivate: () => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">;

/**
 * یک خانهٔ بازار: کارتی (پیش‌فرض)، دایره v1 یا سنجه v2. داده و رفتار مشترک
 * است و فقط پوسته عوض می‌شود؛ خانهٔ اول هر دسته «ویژه» و بزرگ‌تر است.
 */
const AssetCell = forwardRef<HTMLButtonElement, CellProps>(function AssetCell(
  { rate, layout, featured = false, editing = false, selected = false, onActivate, className = "", ...rest },
  ref,
) {
  const direction = directionOf(rate.changePercent);
  const dirClass = DIR_CLASS[direction];
  const price = marketPrice(rate.sell, rate.unit);
  const change = marketChange(rate.changePercent);
  const unit = unitLabel(rate.unit);
  const rollClass = useRollClass(rate.sell, direction);
  const label = `${rate.nameFa}، ${price} ${unit}، ${
    direction === "up" ? "افزایش" : direction === "down" ? "کاهش" : "بدون تغییر"
  } ${change}`;

  const editRing = editing
    ? `outline-dashed outline-1 outline-line-strong ${selected ? "scale-[1.03] shadow-card" : "arrange-wiggle"}`
    : "";
  const selectedRing = selected ? "!shadow-[0_0_0_2px_rgb(var(--c-ink))]" : "";

  if (layout === "square") {
    if (featured) {
      return (
        <button
          ref={ref}
          type="button"
          onClick={onActivate}
          aria-label={label}
          className={`relative flex w-full flex-col justify-between gap-4 overflow-hidden rounded-[24px] border border-line bg-surface p-5 text-right transition-transform duration-150 active:scale-[.98] ${editRing} ${selectedRing} ${className}`}
          {...rest}
        >
          {/* واترمارک حلقهٔ Q */}
          <svg className="wm-breathe pointer-events-none absolute -top-[52px] left-[-46px] h-[210px] w-[210px] text-ink opacity-[.05]" viewBox="12 12 37 38" aria-hidden="true">
            <path d="M45.86 37.90 A17.5 17.5 0 1 0 29.39 47.99 L29.65 40.49 A10 10 0 1 1 39.06 34.73 Z" fill="currentColor" />
            <path d="M28.39 47.88 L28.39 34.30 L29.39 33.70 L35.79 28.90 L35.79 47.01 A17.5 17.5 0 0 1 28.39 47.88 Z" fill="currentColor" />
          </svg>
          <span className="flex items-center gap-3">
            <AssetIcon rate={rate} size={52} />
            <span className="flex flex-col gap-0.5">
              <b className="text-[17px] font-bold">{rate.nameFa}</b>
              <span className="text-[12px] text-muted">{unit}</span>
            </span>
          </span>
          <span className="flex items-end justify-between gap-2.5">
            <span className={`price-roll tabular rounded-[6px] text-[clamp(30px,8vw,40px)] font-bold leading-[1.1] ${dirClass} ${rollClass}`}>
              <span className="dg inline-block">{price}</span>
            </span>
            <span className={`flex items-center gap-1 pb-1.5 text-[15px] font-medium ${dirClass}`}>
              <i className="text-[9px] not-italic" aria-hidden="true">{DIR_ARROW[direction]}</i>
              {change}
            </span>
          </span>
        </button>
      );
    }
    return (
      <button
        ref={ref}
        type="button"
        onClick={onActivate}
        aria-label={label}
        className={`flex aspect-square min-w-0 flex-col justify-between rounded-[16px] border border-line bg-surface p-3.5 text-right transition-transform duration-150 active:scale-[.98] ${editRing} ${selectedRing} ${className}`}
        {...rest}
      >
        <AssetIcon rate={rate} size={40} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[13px] font-medium text-sub">{rate.nameFa}</span>
          <span className={`price-roll tabular whitespace-nowrap rounded-[6px] font-bold leading-tight ${price.length > 13 ? "text-[15px]" : price.length > 10 ? "text-[17px]" : "text-[19px]"} ${dirClass} ${rollClass}`}>
            <span className="dg inline-block">{price}</span>
            {rate.unit === "USD" ? <small className="mr-1 text-[11px] font-medium text-muted">دلار</small> : null}
          </span>
          <span className={`flex items-center gap-1 text-[12px] font-medium ${dirClass}`}>
            <i className="text-[8px] not-italic" aria-hidden="true">{DIR_ARROW[direction]}</i>
            {change}
          </span>
        </span>
      </button>
    );
  }

  /* ---------- دایره v1 و سنجه v2 ---------- */
  const color =
    direction === "up" ? "rgb(var(--c-price-up))" : direction === "down" ? "rgb(var(--c-price-down))" : "rgb(var(--c-faint))";
  const iconSize = featured ? (layout === "circle" ? 50 : 48) : layout === "circle" ? 34 : 32;
  const priceSize = featured ? (layout === "circle" ? 30 : 28) : layout === "circle" ? 16 : 15;

  let ring: React.ReactNode;
  if (layout === "circle") {
    const arc = direction === "flat" ? 0 : TRACK * (0.14 + Math.min(Math.abs(rate.changePercent) / 3, 1) * 0.86);
    ring = (
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-line))" strokeWidth="1.6" strokeDasharray={`${TRACK.toFixed(1)} ${C.toFixed(1)}`} transform="rotate(67.5 50 50)" />
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth={featured ? 2.4 : 2.6} strokeLinecap="round" strokeDasharray={`${arc.toFixed(1)} ${C.toFixed(1)}`} transform="rotate(67.5 50 50)" style={{ transition: "stroke-dasharray 600ms cubic-bezier(.16,1,.3,1)" }} />
        <rect x={featured ? 79 : 78.5} y={featured ? 79 : 78.5} width={featured ? 7 : 8} height={featured ? 7 : 8} rx="1.6" fill={color} />
      </svg>
    );
  } else {
    const pos = gaugePosition(rate);
    const needleFrom = polar(GA0 + GSWEEP * pos, 37);
    const needleTo = polar(GA0 + GSWEEP * pos, 50);
    ring = (
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="41" fill="rgb(var(--c-surface))" />
        <path d={GAUGE_TICKS} stroke="rgb(var(--c-line-strong))" strokeWidth={featured ? 0.8 : 1} fill="none" />
        <path d={GAUGE_TRACK} stroke="rgb(var(--c-line))" strokeWidth={featured ? 2 : 2.4} fill="none" strokeLinecap="round" />
        <path d={gaugeArc(0.5, pos, GR)} stroke={color} strokeWidth={featured ? 3 : 3.4} fill="none" strokeLinecap="round" style={{ transition: "d 600ms cubic-bezier(.16,1,.3,1)" }} />
        <circle cx={GAUGE_OPEN[0].toFixed(2)} cy={GAUGE_OPEN[1].toFixed(2)} r="1" fill="rgb(var(--c-muted))" />
        <line x1={needleFrom[0].toFixed(2)} y1={needleFrom[1].toFixed(2)} x2={needleTo[0].toFixed(2)} y2={needleTo[1].toFixed(2)} stroke={color} strokeWidth={featured ? 2 : 2.6} strokeLinecap="round" />
        <rect x={(GAUGE_DOT[0] - 3.4).toFixed(2)} y={(GAUGE_DOT[1] - 3.4).toFixed(2)} width="6.8" height="6.8" rx="1.5" fill="rgb(var(--c-icon-dot))" className={featured ? "dot-pulse" : undefined} />
      </svg>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onActivate}
      aria-label={label}
      style={featured ? { width: layout === "circle" ? 236 : 244 } : undefined}
      className={`relative grid aspect-square w-full place-items-center rounded-full transition-transform duration-150 active:scale-[.96] ${editRing} ${selectedRing} ${className}`}
      {...rest}
    >
      {ring}
      <span className="relative flex flex-col items-center gap-1 text-center">
        <AssetIcon rate={rate} size={iconSize} className="mb-0.5" />
        <span className={`max-w-[110px] truncate font-medium text-sub ${featured ? "text-[14px]" : "text-[12px]"}`}>{rate.nameFa}</span>
        <span className={`price-roll tabular whitespace-nowrap rounded-[6px] font-bold ${dirClass} ${rollClass}`} style={{ fontSize: priceSize }}>
          <span className="dg inline-block">{price}</span>
          {!featured && rate.unit === "USD" ? <small className="mr-0.5 text-[10px] font-medium text-muted">دلار</small> : null}
        </span>
        <span className={`flex items-center gap-1 font-medium ${featured ? "text-[14px]" : "text-[11px]"} ${dirClass}`}>
          <i className="text-[8px] not-italic" aria-hidden="true">{DIR_ARROW[direction]}</i>
          {change}
        </span>
      </span>
    </button>
  );
});

export default AssetCell;
