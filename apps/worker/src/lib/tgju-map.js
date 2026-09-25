/**
 * نگاشت نماد داخلی «قیمت» به کلید TGJU.
 *
 * هم آداپتور زنده (ajax.json) و هم بک‌فیل تاریخچه (summary-table-data) از
 * همین جدول استفاده می‌کنند تا واحدها فقط یک جا تعریف شوند.
 *
 * unit:
 *   IRR  — ریال؛ برای تومان در factor=0.1 ضرب می‌شود
 *   USD  — دلاری؛ در نرخ دلار همان روز ضرب می‌شود
 *   RAW  — همان‌طور که هست (مثلاً انس جهانی که به دلار نمایش داده می‌شود)
 */
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
  BTC: { key: "crypto-bitcoin", unit: "USD", live: false },
  ETH: { key: "crypto-ethereum", unit: "USD", live: false },
  SOL: { key: "crypto-solana", unit: "USD", live: false },
  TON: { key: "crypto-toncoin", unit: "USD", live: false },
  XRP: { key: "crypto-ripple", unit: "USD", live: false },
  DOGE: { key: "crypto-dogecoin", unit: "USD", live: false },
  BNB: { key: "crypto-binance-coin", unit: "USD", live: false },
  TRX: { key: "crypto-tron", unit: "USD", live: false },
  ADA: { key: "crypto-cardano", unit: "USD", live: false },

  GOLD18: { key: "geram18", unit: "IRR", factor: 0.1 },
  GOLD24: { key: "geram24", unit: "IRR", factor: 0.1 },
  ABSHODEH: { key: "mesghal", unit: "IRR", factor: 0.1 },
  EMAMI: { key: "sekee", unit: "IRR", factor: 0.1 },
  BAHAR: { key: "sekeb", unit: "IRR", factor: 0.1 },
  HALF: { key: "nim", unit: "IRR", factor: 0.1 },
  QUARTER: { key: "rob", unit: "IRR", factor: 0.1 },
  GRAMI: { key: "gerami", unit: "IRR", factor: 0.1 },
  OUNCE: { key: "ons", unit: "RAW" },

  XAU: { key: "ons", unit: "USD", live: false },
  XAG: { key: "silver", unit: "USD", live: false },
  BRENT: { key: "oil_brent", unit: "USD", live: false },
};

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
