/**
 * ثابت‌ها و ابزارهای مشترک بین وب و کرالر.
 * بدون وابستگی خارجی تا در هر دو محیط قابل استفاده باشد.
 */

export const PLANS = [
  {
    id: "monthly",
    label: "ماهانه",
    months: "۱ ماه",
    monthCount: 1,
    price: 15,
    limit: 30000,
    requests: "۳۰٬۰۰۰",
    note: "برای شروع و تست محصول",
  },
  {
    id: "quarterly",
    label: "سه‌ماهه",
    months: "۳ ماه",
    monthCount: 3,
    price: 39,
    limit: 100000,
    requests: "۱۰۰٬۰۰۰",
    note: "مناسب تیم‌های کوچک",
    popular: true,
  },
  {
    id: "semiannual",
    label: "شش‌ماهه",
    months: "۶ ماه",
    monthCount: 6,
    price: 72,
    limit: 250000,
    requests: "۲۵۰٬۰۰۰",
    note: "برای محصولات در حال رشد",
  },
  {
    id: "annual",
    label: "سالانه",
    months: "۱۲ ماه",
    monthCount: 12,
    price: 120,
    limit: 600000,
    requests: "۶۰۰٬۰۰۰",
    note: "بهترین ارزش خرید",
  },
];

export const CATEGORY_TABS = [
  { id: "CURRENCY", label: "ارز" },
  { id: "GOLD", label: "طلا و سکه" },
  { id: "CRYPTO", label: "رمزارز" },
];

export const CATEGORY_SLUGS = {
  currency: "CURRENCY",
  gold: "GOLD",
  crypto: "CRYPTO",
};

export function getPlan(id) {
  return PLANS.find((plan) => plan.id === id) || null;
}

/** قالب‌بندی عدد با ارقام فارسی */
export function fa(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Number(value));
}

/** تبدیل ورودی فارسی/عربی کاربر به عدد */
export function parseNumber(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const normalized = String(value)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** «+٪۱٫۲» یا «−٪۰٫۸» */
export function movement(change) {
  const value = Number(change) || 0;
  return `${value >= 0 ? "+" : "−"}٪${Math.abs(value).toLocaleString("fa-IR", { maximumFractionDigits: 2 })}`;
}

/** فاصله زمانی خوانا به فارسی */
export function timeAgo(date) {
  if (!date) return "—";
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${fa(seconds)} ثانیه پیش`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${fa(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${fa(hours)} ساعت پیش`;
  return `${fa(Math.floor(hours / 24))} روز پیش`;
}

/** ساعت شمسی/محلی تهران */
export function clock(date = new Date()) {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(new Date(date));
}

/** تاریخ کامل شمسی */
export function jalali(date = new Date()) {
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tehran",
  }).format(new Date(date));
}

/** قیمت تومانی یک محصول ارزی بر اساس نرخ دلار و درصد کارمزد */
export function tomanPrice(priceUsd, usdRate, feePercent = 10) {
  if (!priceUsd || !usdRate) return 0;
  const raw = priceUsd * usdRate * (1 + feePercent / 100);
  // گرد کردن به نزدیک‌ترین هزار تومان
  return Math.round(raw / 1000) * 1000;
}
