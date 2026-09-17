/**
 * ابزار پارس متن فارسی برای منابعی که خروجی ساخت‌یافته ندارند
 * (کانال‌های تلگرام و صفحات HTML).
 *
 * اینجا محافظه‌کارانه عمل می‌کنیم: هر عددی که از بازه‌ی منطقی دارایی
 * بیرون بزند دور ریخته می‌شود. در متن آزاد، یک عدد پرت بدتر از نبودِ
 * داده است، چون وارد میانگین می‌شود و نرخ نهایی را خراب می‌کند.
 */

/** ارقام فارسی/عربی به لاتین، و یکسان‌سازی ی و ک عربی */
export function normalizeFa(input) {
  if (!input) return "";
  return String(input)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/ي/g, "ی") // یای عربی
    .replace(/ك/g, "ک") // کاف عربی
    .replace(/\u200c/g, " ") // نیم‌فاصله
    .replace(/[٬،]/g, ",")
    .replace(/\s+/g, " ");
}

/** عدد از متن، با پشتیبانی از جداکننده‌ی هزارگان و ارقام فارسی */
export function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const clean = normalizeFa(value).replace(/[,\s]/g, "").replace(/٫/g, ".");
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * بازه‌ی منطقی هر دارایی بر حسب تومان.
 * هدف، رد کردن عددهای بی‌ربط است (شماره‌ی کانال، ساعت، تاریخ، تعداد بازدید)،
 * نه دقت اقتصادی. بازه‌ها عمداً گشاد گرفته شده‌اند تا در نوسان شدید بازار
 * داده‌ی درست را دور نریزند.
 */
export const SANITY = {
  USD: [50_000, 2_000_000],
  EUR: [50_000, 2_500_000],
  GBP: [60_000, 3_000_000],
  AED: [10_000, 500_000],
  TRY: [1_000, 100_000],
  CNY: [5_000, 300_000],
  JPY: [200, 50_000],
  CAD: [30_000, 1_500_000],
  RUB: [500, 50_000],
  IQD: [20, 5_000],
  KWD: [200_000, 10_000_000],
  USDT: [50_000, 2_000_000],
  GOLD18: [3_000_000, 300_000_000],
  GOLD24: [4_000_000, 400_000_000],
  ABSHODEH: [10_000_000, 1_500_000_000],
  EMAMI: [50_000_000, 4_000_000_000],
  BAHAR: [50_000_000, 4_000_000_000],
  HALF: [20_000_000, 2_000_000_000],
  QUARTER: [10_000_000, 1_000_000_000],
  GRAMI: [5_000_000, 500_000_000],
};

export function isSane(symbol, value) {
  const range = SANITY[symbol];
  if (!range) return value > 0;
  return value >= range[0] && value <= range[1];
}

/**
 * نگاشت برچسب فارسی به نماد داخلی.
 * ترتیب مهم است — الگوهای خاص‌تر باید جلوتر بیایند، وگرنه مثلاً
 * «دلار کانادا» با الگوی «دلار» گرفته می‌شود.
 */
const LABELS = [
  [/دلار\s*کانادا/, "CAD"],
  [
    /دلار\s*(آمریکا|امریکا)|^دلار\b|دلار\s*(فردایی|تهران|هرات|نقدی|آزاد)/,
    "USD",
  ],
  [/یورو/, "EUR"],
  [/پوند/, "GBP"],
  [/درهم/, "AED"],
  [/لیر/, "TRY"],
  [/یوان/, "CNY"],
  [/ین\s*ژاپن/, "JPY"],
  [/روبل/, "RUB"],
  [/دینار\s*کویت/, "KWD"],
  [/دینار\s*عراق/, "IQD"],
  [/تتر|tether|usdt/i, "USDT"],

  [/آبشده|اب\s*شده/, "ABSHODEH"],
  [/طلا[ی]?\s*گرمی|گرم\s*طلا|^گرم\b/, "GOLD18"],
  [/طلا[ی]?\s*18\s*عیار|18\s*عیار/, "GOLD18"],
  [/طلا[ی]?\s*24\s*عیار|24\s*عیار/, "GOLD24"],
  [/نیم\s*سکه/, "HALF"],
  [/ربع\s*سکه/, "QUARTER"],
  [/سکه\s*گرمی/, "GRAMI"],
  [/سکه\s*امامی|امامی/, "EMAMI"],
  [/سکه\s*بهار|بهار\s*آزادی/, "BAHAR"],
];

/** نماد دارایی از روی یک قطعه متن، یا null */
export function symbolFor(text) {
  const clean = normalizeFa(text);
  for (const [pattern, symbol] of LABELS) {
    if (pattern.test(clean)) return symbol;
  }
  return null;
}

/** خرید یا فروش؟ null یعنی مشخص نیست */
export function sideFor(text) {
  const clean = normalizeFa(text);
  if (/\bفروش\b/.test(clean)) return "sell";
  if (/\bخرید\b/.test(clean)) return "buy";
  return null;
}

/**
 * بخش‌هایی از متن که قطعاً قیمت نیستند را حذف می‌کند:
 * ساعت، تاریخ شمسی، شناسه‌ی کانال.
 */
export function stripNoise(text) {
  return normalizeFa(text)
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, " ") // ساعت
    .replace(/1[34]\d{2}\/\d{1,2}\/\d{1,2}/g, " ") // تاریخ شمسی
    .replace(/@[\w_]+/g, " ") // آیدی کانال
    .replace(/#/g, " "); // هشتگ
}
