"use client";

import { forwardRef } from "react";
import { unitLabel } from "@qeymat/shared";
import RateIcon from "./RateIcon";
import { formatPrice } from "./PriceChart";
import type { RateView } from "@/lib/types";

/** زمینه‌ی کارت از جهت تغییر امروز: سبز صعودی، قرمز نزولی، خنثی بی‌تغییر */
function toneOf(change: number) {
  if (change > 0) return "border-green/25 bg-green-soft/70 hover:border-green/45";
  if (change < 0) return "border-danger/25 bg-danger-soft/70 hover:border-danger/45";
  return "border-line bg-surface hover:border-line-strong";
}

type Props = {
  rate: RateView;
  onOpen: () => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">;

/**
 * کارت یک دارایی: فقط نشانه، نام و قیمت. درصد تغییر عدد نمی‌شود و فقط با
 * رنگ زمینه دیده می‌شود؛ جزئیات کامل با زدن روی کارت باز می‌شود.
 */
const RateCard = forwardRef<HTMLButtonElement, Props>(function RateCard(
  { rate, onOpen, className = "", ...rest },
  ref,
) {
  const price = formatPrice(rate.sell);
  // قیمت‌های میلیاردی (سکه، بیت‌کوین) در کارت دوستونی موبایل جا نمی‌شدند
  const size = price.length > 12 ? "text-[14px]" : price.length > 10 ? "text-[15.5px]" : "text-[17px]";
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      className={`flex min-w-0 flex-col gap-3 rounded-card border p-3.5 text-right transition-[border-color,box-shadow,transform] hover:shadow-card ${toneOf(rate.changePercent)} ${className}`}
      {...rest}
    >
      <span className="flex items-center gap-2.5">
        <RateIcon rate={rate} />
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-[12.5px] text-ink">{rate.nameFa}</strong>
          <small dir="ltr" className="block text-right text-[10px] text-faint">
            {rate.symbol}
          </small>
        </span>
      </span>
      {/* واحد زیر عدد می‌آید تا عدد تمام پهنای کارت را داشته باشد */}
      <span className="flex min-w-0 flex-col">
        <strong className={`tabular truncate font-extrabold leading-tight tracking-[-.4px] text-ink ${size}`}>
          {price}
        </strong>
        <small className="mt-0.5 text-[10px] text-muted">{unitLabel(rate.unit)}</small>
      </span>
    </button>
  );
});

export default RateCard;
