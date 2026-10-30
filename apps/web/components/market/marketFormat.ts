import type { RateView } from "@/lib/types";

export type Direction = "up" | "down" | "flat";

/** جهت تغییر، معیار رنگ در فاز ۲: افزایش سبز، کاهش قرمز، بی‌تغییر خنثی */
export function directionOf(change: number): Direction {
  if (Math.abs(change) < 0.005) return "flat";
  return change > 0 ? "up" : "down";
}

export const DIR_CLASS: Record<Direction, string> = {
  up: "dir-up",
  down: "dir-down",
  flat: "dir-flat",
};

export const DIR_ARROW: Record<Direction, string> = { up: "▲", down: "▼", flat: "—" };

const faNum = (value: number, digits = 0) =>
  new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

/**
 * قاعدهٔ عدد فاز ۲: ارقام فارسی با «٬»، دلاری‌ها دو رقم اعشار،
 * و از یک میلیارد کوتاه‌نویسی «میلیارد».
 */
export function marketPrice(value: number, unit?: string | null): string {
  if (unit === "USD") return faNum(value, value < 100 ? 2 : value < 10000 ? 2 : 0);
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${faNum(value / 1e9, 2)} میلیارد`;
  if (abs >= 1000) return faNum(Math.round(value));
  return faNum(value, 2);
}

/** «۰٫۸۴٪» — علامت جهت فقط فلش است، نه + یا − */
export function marketChange(change: number): string {
  return `${faNum(Math.abs(change), 2)}٪`;
}

/**
 * قیمت کاشی بنتو (فاز شیشه‌ای): عدد کوتاه + واحد جدا تا واحد در خط دوم‌نما
 * بنشیند — «۱۱۲٫۴ میلیون»، «۹۶٬۴۲۰ دلار»، «۱۰۸٬۴۵۰ تومان».
 */
export function bentoPrice(value: number, unit?: string | null): { num: string; unit: string } {
  if (unit === "USD") {
    return { num: faNum(value, value < 100 ? 2 : 0), unit: "دلار" };
  }
  const abs = Math.abs(value);
  if (abs >= 1e9) return { num: faNum(value / 1e9, 2), unit: "میلیارد" };
  if (abs >= 1e6) return { num: faNum(value / 1e6, abs / 1e6 < 100 ? 2 : 1), unit: "میلیون" };
  return { num: faNum(Math.round(value)), unit: "تومان" };
}

/** «۰٫۸٪» — یک رقم اعشار برای چیپ کاشی */
export function bentoChange(change: number): string {
  return `${faNum(Math.abs(change), 1)}٪`;
}

/** جای عقربهٔ سنجه در بازهٔ امروز؛ بدون دامنه، از درصد تغییر تخمین می‌خورد */
export function gaugePosition(rate: Pick<RateView, "sell" | "dayLow" | "dayHigh" | "changePercent">): number {
  const { sell, dayLow, dayHigh } = rate;
  const pos =
    dayLow != null && dayHigh != null && dayHigh > dayLow
      ? (sell - dayLow) / (dayHigh - dayLow)
      : 0.5 + rate.changePercent / 4;
  return Math.max(0.04, Math.min(0.96, pos));
}
