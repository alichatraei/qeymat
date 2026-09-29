/**
 * نگاشت نماد داخلی «قیمت» به کلید TGJU.
 *
 * هم آداپتور زنده (ajax.json) و هم بک‌فیل تاریخچه (summary-table-data) از
 * همین جدول استفاده می‌کنند تا واحدها فقط یک جا تعریف شوند.
 *
 * live:
 *   false  — فقط برای بک‌فیل تاریخچه
 *   {key, unit, factor} — نرخ زنده از کلید دیگری خوانده می‌شود
 *
 * unit:
 *   IRR  — ریال؛ برای تومان در factor=0.1 ضرب می‌شود
 *   USD  — دلاری؛ در نرخ دلار همان روز ضرب می‌شود
 *   RAW  — همان‌طور که هست (مثلاً انس جهانی که به دلار نمایش داده می‌شود)
 */
/** کلید زنده‌ی جدا با قیمت ریالی */
const irr = (key) => ({ key, unit: "IRR", factor: 0.1 });

export const TGJU_KEYS = {
  USD: { key: "price_dollar_rl", unit: "IRR", factor: 0.1 },
  USD_FARDA: { key: "price_dollar_future", unit: "IRR", factor: 0.1, live: false },
  EUR: { key: "price_eur", unit: "IRR", factor: 0.1 },
  AED: { key: "price_aed", unit: "IRR", factor: 0.1 },
  GBP: { key: "price_gbp", unit: "IRR", factor: 0.1 },
  TRY: { key: "price_try", unit: "IRR", factor: 0.1 },
  CNY: { key: "price_cny", unit: "IRR", factor: 0.1 },
  CAD: { key: "price_cad", unit: "IRR", factor: 0.1 },
  // TGJU ین را برای ۱۰۰ واحد اعلام می‌کند
  JPY: { key: "price_jpy", unit: "IRR", factor: 0.001 },
  RUB: { key: "price_rub", unit: "IRR", factor: 0.1 },
  IQD: { key: "price_iqd", unit: "IRR", factor: 0.1 },
  KWD: { key: "price_kwd", unit: "IRR", factor: 0.1 },

  USDT: { key: "crypto-tether-irr", unit: "IRR", factor: 0.1 },
  // رمزارز: تاریخچه از کلید دلاری، نرخ زنده از کلید ریالی همان رمزارز (منبع سوم کنار
  // بیت‌پین و والکس؛ برای TON که آن دو ندارند، تنها منبع)
  BTC: { key: "crypto-bitcoin", unit: "USD", live: irr("crypto-bitcoin-irr") },
  ETH: { key: "crypto-ethereum", unit: "USD", live: irr("crypto-ethereum-irr") },
  SOL: { key: "crypto-solana", unit: "USD", live: irr("crypto-solana-irr") },
  TON: { key: "crypto-toncoin", unit: "USD", live: irr("crypto-toncoin-irr") },
  XRP: { key: "crypto-ripple", unit: "USD", live: irr("crypto-ripple-irr") },
  DOGE: { key: "crypto-dogecoin", unit: "USD", live: irr("crypto-dogecoin-irr") },
  BNB: { key: "crypto-binance-coin", unit: "USD", live: irr("crypto-binance-coin-irr") },
  TRX: { key: "crypto-tron", unit: "USD", live: irr("crypto-tron-irr") },
  ADA: { key: "crypto-cardano", unit: "USD", live: irr("crypto-cardano-irr") },

  GOLD18: { key: "geram18", unit: "IRR", factor: 0.1 },
  GOLD24: { key: "geram24", unit: "IRR", factor: 0.1 },
  ABSHODEH: { key: "mesghal", unit: "IRR", factor: 0.1 },
  EMAMI: { key: "sekee", unit: "IRR", factor: 0.1 },
  BAHAR: { key: "sekeb", unit: "IRR", factor: 0.1 },
  HALF: { key: "nim", unit: "IRR", factor: 0.1 },
  QUARTER: { key: "rob", unit: "IRR", factor: 0.1 },
  GRAMI: { key: "gerami", unit: "IRR", factor: 0.1 },
  OUNCE: { key: "ons", unit: "RAW" },

  // کالا و فلزات: قیمت دلاری TGJU در نرخ دلار ضرب و تومانی می‌شود (مثل بقیه‌ی دارایی‌ها)؛
  // قیمت دلاری همان globalPrice است. TGJU نرخ زنده‌ی WTI ندارد (کلید oil از تیر به‌روز نشده).
  XAU: { key: "ons", unit: "USD" },
  XAG: { key: "silver", unit: "USD" },
  XPT: { key: "platinum", unit: "USD" },
  XPD: { key: "palladium", unit: "USD" },
  // هر تن
  XCU: { key: "base_global_copper", unit: "USD" },
  BRENT: { key: "oil_brent", unit: "USD" },
  OPEC: { key: "oil_opec", unit: "USD" },
  NATGAS: { key: "energy_natural_gas", unit: "USD" },
  // نقره‌ی ۹۹۹ بازار ایران، هر گرم به ریال
  SILVER999: { key: "silver_999", unit: "IRR", factor: 0.1 },
};

/**
 * کلید TGJU یک دارایی. ارزهایی که در جدول بالا نیستند (کاتالوگ ارزهای جهان)
 * با الگوی استاندارد price_<کد ISO> و قیمت ریالی برای یک واحد خوانده می‌شوند.
 */
export function tgjuSpecFor(symbol, category) {
  if (TGJU_KEYS[symbol]) return TGJU_KEYS[symbol];
  if (category === "CURRENCY" && /^[A-Z]{3}$/.test(symbol)) {
    return { key: `price_${symbol.toLowerCase()}`, unit: "IRR", factor: 0.1 };
  }
  return null;
}

/** «2,346,150» یا «۲٬۳۴۶٬۱۵۰» ← عدد */
export function tgjuNumber(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/[،٬,\s%]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
