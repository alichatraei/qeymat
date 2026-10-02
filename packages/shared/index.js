/**
 * ثابت‌ها و ابزارهای مشترک بین وب و کرالر.
 * بدون وابستگی خارجی تا در هر دو محیط قابل استفاده باشد.
 */

/**
 * پلن‌های وب‌سرویس API. قیمت‌ها به **تومان** هستند و پرداخت از
 * درگاه زرین‌پال انجام می‌شود؛ تبدیل به ریال فقط در لایه‌ی درگاه.
 */
export const PLANS = [
  {
    id: "monthly",
    label: "ماهانه",
    months: "۱ ماه",
    monthCount: 1,
    price: 300000,
    limit: 30000,
    requests: "۳۰٬۰۰۰",
    note: "برای شروع و تست محصول",
  },
  {
    id: "quarterly",
    label: "سه‌ماهه",
    months: "۳ ماه",
    monthCount: 3,
    price: 790000,
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
    price: 1450000,
    limit: 250000,
    requests: "۲۵۰٬۰۰۰",
    note: "برای محصولات در حال رشد",
  },
  {
    id: "annual",
    label: "سالانه",
    months: "۱۲ ماه",
    monthCount: 12,
    price: 2590000,
    limit: 600000,
    requests: "۶۰۰٬۰۰۰",
    note: "بهترین ارزش خرید",
  },
];

/**
 * پلن‌های «قیمت پلاس». قیمت به تومان.
 *
 * همه‌ی قیمت‌ها برای همه رایگان است؛ پلاس «تحلیل قیمت» و «هشدار پیامکی»
 * را باز می‌کند. سطح پلن تعیین می‌کند روی چند شاخص می‌شود هشدار پیامکی
 * گذاشت: پلاس تا ۱۰ شاخص، حرفه‌ای تا ۵۰ شاخص.
 */
export const PLUS_TIERS = [
  {
    id: "plus",
    label: "پلاس",
    smsAlerts: 10,
    note: "تحلیل قیمت و هشدار پیامکی برای ۱۰ شاخص",
  },
  {
    id: "pro",
    label: "پلاس حرفه‌ای",
    smsAlerts: 50,
    note: "برای معامله‌گرها — هشدار پیامکی برای ۵۰ شاخص",
  },
];

export const PLUS_PLANS = [
  {
    id: "plus-monthly",
    tier: "plus",
    smsAlerts: 10,
    label: "ماهانه",
    months: "۱ ماه",
    monthCount: 1,
    price: 99000,
    note: "برای امتحان کردن",
  },
  {
    id: "plus-quarterly",
    tier: "plus",
    smsAlerts: 10,
    label: "سه‌ماهه",
    months: "۳ ماه",
    monthCount: 3,
    price: 249000,
    note: "۱۶٪ ارزان‌تر از ماهانه",
    popular: true,
  },
  {
    id: "plus-annual",
    tier: "plus",
    smsAlerts: 10,
    label: "سالانه",
    months: "۱۲ ماه",
    monthCount: 12,
    price: 790000,
    note: "۳۳٪ ارزان‌تر از ماهانه",
  },
  {
    id: "pro-monthly",
    tier: "pro",
    smsAlerts: 50,
    label: "ماهانه",
    months: "۱ ماه",
    monthCount: 1,
    price: 249000,
    note: "هشدار پیامکی برای ۵۰ شاخص",
  },
  {
    id: "pro-quarterly",
    tier: "pro",
    smsAlerts: 50,
    label: "سه‌ماهه",
    months: "۳ ماه",
    monthCount: 3,
    price: 649000,
    note: "۱۳٪ ارزان‌تر از ماهانه",
    popular: true,
  },
  {
    id: "pro-annual",
    tier: "pro",
    smsAlerts: 50,
    label: "سالانه",
    months: "۱۲ ماه",
    monthCount: 12,
    price: 1990000,
    note: "۳۳٪ ارزان‌تر از ماهانه",
  },
];

/** مزیت‌هایی که در صفحه‌ی فروش قیمت پلاس فهرست می‌شوند. */
export const PLUS_FEATURES = [
  "تحلیل تکنیکال هر دارایی: روند، RSI، میانگین‌های متحرک، نوسان",
  "حباب سکه و فاصله‌ی دلار و تتر، به‌روز در هر دقیقه",
  "هشدار قیمت با پیامک، حتی وقتی مرورگر بسته است",
  "سطوح حمایت و مقاومت و بیشترین و کمترین ۵۲ هفته",
  "مقایسه‌ی بازدهی دارایی‌ها تا ۱۰ سال",
];

/** سقف هشدار پیامکی یک پلن؛ صفر یعنی پلن پلاس نیست. */
export function smsAlertLimit(planId) {
  return getPlusPlan(planId)?.smsAlerts ?? 0;
}

export function getPlusPlan(id) {
  return PLUS_PLANS.find((plan) => plan.id === id) || null;
}

/** هر پلنی، چه API چه پلاس. */
export function getAnyPlan(id) {
  return getPlan(id) || getPlusPlan(id);
}

export const CATEGORY_TABS = [
  { id: "CURRENCY", label: "ارز" },
  { id: "GOLD", label: "طلا و سکه" },
  { id: "CRYPTO", label: "رمزارز" },
  { id: "COMMODITY", label: "کالا و انرژی" },
  { id: "STOCK", label: "سهام جهانی" },
  { id: "INDEX", label: "شاخص‌ها" },
];

/** نمادهای «خانواده‌ی دلار» که در بالای صفحه جدا از بقیه‌ی ارزها نشان داده می‌شوند. */
export const DOLLAR_SYMBOLS = ["USD", "USD_FARDA", "USD_HERAT", "USDT"];

/**
 * خانواده‌ی نرخ‌های هم‌خانواده برای بخش «نرخ‌های مرتبط» در جزئیات:
 * دلار تهران کنار فردایی، هرات و تتر؛ طلا کنار آبشده و انس؛ سکه‌ها کنار هم.
 * اپ اندروید همین فهرست را در core/model دارد.
 */
export const RATE_FAMILIES = [
  DOLLAR_SYMBOLS,
  ["GOLD18", "GOLD24", "ABSHODEH", "OUNCE", "EMAMI"],
  ["EMAMI", "BAHAR", "HALF", "QUARTER", "GRAMI", "GOLD18"],
  ["BRENT", "WTI", "OPEC", "NATGAS"],
  ["XAU", "OUNCE", "XAG", "SILVER999", "XPT", "XPD"],
  ["BTC", "ETH", "USDT", "SOL", "TON"],
];

/** تا ۵ نرخ مرتبط؛ اگر دارایی خانواده نداشت، هم‌دسته‌های اول فهرست */
export function relatedSymbols(symbol, assets, limit = 5) {
  const available = new Set(assets.map((asset) => asset.symbol));
  const family = RATE_FAMILIES.find((list) => list[0] === symbol) ?? RATE_FAMILIES.find((list) => list.includes(symbol));
  let list = family ? family.filter((item) => item !== symbol && available.has(item)) : [];
  if (list.length < 2) {
    const category = assets.find((asset) => asset.symbol === symbol)?.category;
    const peers = assets.filter((asset) => asset.category === category && asset.symbol !== symbol).map((asset) => asset.symbol);
    list = [...list, ...peers.filter((item) => !list.includes(item))];
  }
  return list.slice(0, limit);
}

/**
 * بازه‌های نمودار. `days` صفر یعنی «همه‌ی تاریخچه‌ی موجود» که سقفش ۱۰ سال است.
 * `interval` پیش‌فرض دانه‌بندی مناسب همان بازه است.
 */
export const CHART_RANGES = [
  { id: "1d", label: "۱ روز", days: 1, interval: "raw" },
  { id: "1w", label: "۱ هفته", days: 7, interval: "day" },
  { id: "1m", label: "۱ ماه", days: 31, interval: "day" },
  { id: "3m", label: "۳ ماه", days: 92, interval: "day" },
  { id: "1y", label: "۱ سال", days: 366, interval: "day" },
  { id: "3y", label: "۳ سال", days: 3 * 366, interval: "month" },
  { id: "5y", label: "۵ سال", days: 5 * 366, interval: "month" },
  { id: "10y", label: "۱۰ سال", days: 10 * 366, interval: "month" },
];

export const CHART_INTERVALS = [
  { id: "day", label: "روزانه" },
  { id: "month", label: "ماهانه" },
  { id: "year", label: "سالانه" },
];

/** حداکثر عمق تاریخچه‌ی نمودار */
export const MAX_HISTORY_YEARS = 10;

/** برچسب واحد قیمت */
export function unitLabel(unit) {
  return unit === "USD" ? "دلار" : "تومان";
}

export const CATEGORY_SLUGS = {
  currency: "CURRENCY",
  gold: "GOLD",
  crypto: "CRYPTO",
  commodity: "COMMODITY",
  stock: "STOCK",
  index: "INDEX",
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
const JALALI_PARTS = new Intl.DateTimeFormat("fa-IR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Tehran",
});

// ترتیب خروجی format در نسخه‌های مختلف ICU فرق دارد («۱۴۰۵ مهر ۶, دوشنبه»)؛
// برای همین از اجزا ساخته می‌شود: «دوشنبه ۶ مهر ۱۴۰۵»
export function jalali(date = new Date()) {
  const parts = {};
  for (const part of JALALI_PARTS.formatToParts(new Date(date))) parts[part.type] = part.value;
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`;
}

/** قیمت تومانی یک محصول ارزی بر اساس نرخ دلار و درصد کارمزد */
export function tomanPrice(priceUsd, usdRate, feePercent = 10) {
  if (!priceUsd || !usdRate) return 0;
  const raw = priceUsd * usdRate * (1 + feePercent / 100);
  // گرد کردن به نزدیک‌ترین هزار تومان
  return Math.round(raw / 1000) * 1000;
}
