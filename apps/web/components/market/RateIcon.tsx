import * as Flags from "country-flag-icons/react/3x2";
import { Coins, CircleDollarSign } from "lucide-react";
import type { RateView } from "@/lib/types";
import AssetArt, { hasAssetArt } from "./AssetArt";

const SIZES = {
  small: "h-8 w-8 text-[12px]",
  normal: "h-10 w-10 text-[14px]",
  large: "h-[58px] w-[58px] text-[20px]",
} as const;

/**
 * آیکون دارایی: پرچم کشور برای ارز، آواتار تصویری برای طلا، سکه، رمزارز،
 * کالا و سهام، و نشانه‌ی متنی برای دارایی تازه‌ای که هنوز آواتار ندارد.
 */
export default function RateIcon({
  rate,
  size = "normal",
}: {
  rate: Pick<RateView, "symbol" | "countryCode" | "mark" | "category" | "nameFa">;
  size?: keyof typeof SIZES;
}) {
  const base = `grid shrink-0 place-items-center overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(7,19,31,.08)] ${SIZES[size]}`;

  if (rate.countryCode) {
    const Flag = (Flags as Record<string, React.ComponentType<{ className?: string; title?: string }>>)[
      rate.countryCode
    ];
    if (Flag) {
      return (
        <span className={base} aria-hidden="true">
          <Flag className="h-full w-full object-cover" title={rate.nameFa} />
        </span>
      );
    }
  }

  if (hasAssetArt(rate.symbol)) {
    return (
      <span className={base} aria-hidden="true">
        <AssetArt symbol={rate.symbol} title={rate.nameFa} />
      </span>
    );
  }

  return (
    <span className={`${base} bg-green-soft font-extrabold text-green-dark`} aria-hidden="true">
      {rate.mark?.trim() ? (
        <span className="leading-none">{rate.mark}</span>
      ) : rate.category === "GOLD" ? (
        <Coins className="h-1/2 w-1/2" />
      ) : (
        <CircleDollarSign className="h-1/2 w-1/2" />
      )}
    </span>
  );
}
