/**
 * ابزار پارس متن فارسی برای منابعی که خروجی ساخت‌یافته ندارند
 * (کانال‌های تلگرام و صفحات HTML).
 *
 * اینجا محافظه‌کارانه عمل می‌کنیم: هر عددی که از بازه‌ی منطقی دارایی
 * بیرون بزند دور ریخته می‌شود. در متن آزاد، یک عدد پرت بدتر از نبودِ
 * داده است، چون وارد میانگین می‌شود و نرخ نهایی را خراب می‌کند.
 *
 * نکته: `\b` در RegExp جاوااسکریپت فقط مرز کلمه‌ی ASCII را می‌شناسد و
 * کنار حروف فارسی هرگز برقرار نمی‌شود؛ برای همین مرزها با lookaround
 * روی «حرف فارسی نبودن» ساخته شده‌اند.
 */

/** ارقام فارسی/عربی به لاتین، یکسان‌سازی حروف عربی، حذف کشیده و نویسه‌های نامرئی */
export function normalizeFa(input) {
  if (!input) return "";
  return String(input)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/ي/g, "ی") // یای عربی
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک") // کاف عربی
    .replace(/[أإ]/g, "ا")
    .replace(/ـ/g, "") // کشیده: «خــرید» ← «خرید»
    .replace(/[‌ ]/g, " ") // نیم‌فاصله و فاصله‌ی نشکن
    .replace(/[​‍-‏‪-‮⁠-⁩﻿]/g, "") // جهت‌نماها
    .replace(/_/g, " ") // هشتگ‌ها: «طلا_گرمی» ← «طلا گرمی»
    .replace(/[٬،]/g, ",")
    .replace(/[ \t]+/g, " ");
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
 * هدف، رد کردن عددهای بی‌ربط است (شماره‌ی کانال، ساعت، تاریخ، تعداد بازدید،
 * یا نرخ ریالی که به‌اشتباه تومانی فرض شده)، نه دقت اقتصادی. بازه‌ها عمداً
 * گشاد گرفته شده‌اند تا در نوسان شدید بازار داده‌ی درست را دور نریزند.
 */
export const SANITY = {
  // حدود حدوداً ۵ برابر بالا و پایین نرخ مهر ۱۴۰۵ — آن‌قدر گشاد که نوسان
  // واقعی را رد نکند و آن‌قدر تنگ که نرخ ریالی (۱۰ برابر) از آن رد نشود.
  USD: [50_000, 1_200_000],
  USD_FARDA: [50_000, 1_200_000],
  USD_HERAT: [50_000, 1_200_000],
  USDT: [50_000, 1_200_000],
  EUR: [55_000, 1_400_000],
  GBP: [60_000, 1_600_000],
  AED: [13_000, 320_000],
  TRY: [900, 25_000],
  CNY: [7_000, 180_000],
  JPY: [300, 8_000],
  CAD: [33_000, 850_000],
  RUB: [500, 14_000],
  IQD: [30, 900],
  KWD: [150_000, 3_800_000],
  GOLD18: [4_500_000, 120_000_000],
  GOLD24: [6_000_000, 160_000_000],
  ABSHODEH: [20_000_000, 520_000_000],
  EMAMI: [45_000_000, 1_200_000_000],
  BAHAR: [45_000_000, 1_200_000_000],
  HALF: [23_000_000, 620_000_000],
  QUARTER: [12_000_000, 330_000_000],
  GRAMI: [6_000_000, 170_000_000],
  // انس جهانی به دلار
  OUNCE: [500, 20_000],
};

/**
 * برای تاریخچه‌ی بلندمدت فقط سقف بررسی می‌شود: قیمت ده سال پیش طبیعتاً
 * خیلی پایین‌تر از کف امروز است، ولی خطای واحد (ریال به‌جای تومان) همیشه
 * عدد را بزرگ‌تر می‌کند.
 */
export function isSaneHistory(symbol, value) {
  if (!(value > 0) || !Number.isFinite(value)) return false;
  const range = SANITY[String(symbol).toUpperCase()];
  return range ? value <= range[1] : true;
}

export function isSane(symbol, value) {
  if (!(value > 0) || !Number.isFinite(value)) return false;
  const range = SANITY[String(symbol).toUpperCase()];
  if (!range) return true;
  return value >= range[0] && value <= range[1];
}

/** مرز واژه برای متن فارسی: نویسه‌ی قبل/بعد حرف نباشد */
const B = "(?<![\\p{L}])";
const E = "(?![\\p{L}])";
const word = (source) => new RegExp(`${B}(?:${source})${E}`, "u");

/**
 * نگاشت برچسب فارسی به نماد داخلی.
 * ترتیب مهم است — الگوهای خاص‌تر باید جلوتر بیایند، وگرنه مثلاً
 * «دلار کانادا» با الگوی «دلار» یا «سکه گرمی» با «گرمی» گرفته می‌شود.
 */
const LABELS = [
  [word("دلار\\s*کانادا"), "CAD"],
  [/هرات/u, "USD_HERAT"],
  [word("دلار\\s*فردایی|فردایی\\s*دلار"), "USD_FARDA"],
  [
    word("دلار(?:\\s*(?:آمریکا|امریکا|نقدی|آزاد|تهران|بازار))*|دلار"),
    "USD",
  ],
  [word("یورو"), "EUR"],
  [word("پوند"), "GBP"],
  [word("درهم"), "AED"],
  [word("لیر"), "TRY"],
  [word("یوآن|یوان"), "CNY"],
  [word("ین\\s*ژاپن"), "JPY"],
  [word("روبل"), "RUB"],
  [word("دینار\\s*کویت"), "KWD"],
  [word("دینار\\s*عراق"), "IQD"],
  [/تتر|tether|usdt/iu, "USDT"],

  [word("نیم\\s*سکه"), "HALF"],
  [word("ربع\\s*سکه"), "QUARTER"],
  [word("سکه\\s*گرمی"), "GRAMI"],
  [word("سکه\\s*(?:امامی|امام)|امامی"), "EMAMI"],
  [word("سکه\\s*بهار(?:\\s*آزادی)?|بهار\\s*آزادی"), "BAHAR"],
  [/آبشده|آب\s*شده|اب\s*شده|مثقال/u, "ABSHODEH"],
  [word("طلا(?:ی)?\\s*24\\s*عیار|24\\s*عیار"), "GOLD24"],
  [word("طلا(?:ی)?\\s*18\\s*عیار|18\\s*عیار"), "GOLD18"],
  [word("طلا(?:ی)?\\s*گرمی|گرم\\s*طلا"), "GOLD18"],
  // «گرم: 23,846,899» در کانال‌های آبشده قیمت هر گرم طلای ۱۸ است
  [/^\s*گرم\s*:/u, "GOLD18"],
];

/** نماد دارایی از روی یک قطعه متن، یا null */
export function symbolFor(text) {
  const clean = normalizeFa(text);
  for (const [pattern, symbol] of LABELS) {
    if (pattern.test(clean)) return symbol;
  }
  return null;
}

const SELL = word("فروش");
const BUY = word("خرید");
const TRADE = word("معامله|آخرین\\s*معامله");

/** خرید، فروش یا معامله؟ null یعنی مشخص نیست */
export function sideFor(text) {
  const clean = normalizeFa(text);
  if (SELL.test(clean)) return "sell";
  if (BUY.test(clean)) return "buy";
  if (TRADE.test(clean)) return "trade";
  return null;
}

/** خط‌هایی که عددشان قیمت لحظه نیست (سقف، کف، شروع روز، …) */
const SKIP = word("سقف|کف|شروع|بازگشایی|پایان|حجم|تغییر|درصد|بازدید");

export function isSummaryLine(text) {
  return SKIP.test(normalizeFa(text));
}

/**
 * بخش‌هایی از متن که قطعاً قیمت نیستند را حذف می‌کند:
 * ساعت، تاریخ شمسی/میلادی، شناسه‌ی کانال.
 */
export function stripNoise(text) {
  return normalizeFa(text)
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, " ") // ساعت
    .replace(/1[34]\d{2}[/.\-]\d{1,2}[/.\-]\d{1,2}/g, " ") // تاریخ شمسی
    .replace(/20\d{2}[/.\-]\d{1,2}[/.\-]\d{1,2}/g, " ") // تاریخ میلادی
    .replace(/@[\w_]+/g, " ") // آیدی کانال
    .replace(/#/g, " "); // هشتگ
}
