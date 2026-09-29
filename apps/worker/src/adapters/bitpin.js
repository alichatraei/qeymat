import { fetchJson } from "../lib/http.js";

/**
 * بیت‌پین — قیمت لحظه‌ای رمزارزها به تومان.
 *
 * GET /api/v1/mkt/tickers/ آرایه‌ای از بازارهاست:
 *   [{ symbol: "BTC_IRT", price: "21304521908", daily_change_price: 5.1,
 *      low, high, timestamp: 1790687204.69 }, { symbol: "BTC_USDT", ... }, ...]
 *
 * price آخرین معامله است (خرید و فروش جدا ندارد)؛ اختلاف خرید و فروش را
 * موتور اجماع از منابع دیگر می‌گیرد.
 */
const DEFAULT_SYMBOLS = ["BTC", "ETH", "USDT", "SOL", "TON", "DOGE", "XRP", "BNB", "ADA", "TRX"];

export async function fetchBitpin(source) {
  const config = source.config || {};
  const symbols = (config.symbols?.length ? config.symbols : DEFAULT_SYMBOLS).map((s) => s.toUpperCase());
  const maxAgeMs = (config.maxAgeMinutes || 60) * 60 * 1000;

  const list = await fetchJson(source.endpoint || "https://api.bitpin.ir/api/v1/mkt/tickers/", {
    headers: { Accept: "application/json" },
    timeoutMs: config.timeoutMs || 12000,
  });
  if (!Array.isArray(list)) throw new Error("پاسخ نامعتبر از بیت‌پین");

  const bySymbol = new Map(list.map((row) => [row.symbol, row]));
  const rates = {};

  for (const symbol of symbols) {
    const row = bySymbol.get(`${symbol}_IRT`);
    const sell = num(row?.price);
    if (!sell) continue;

    // بازار کم‌معامله ممکن است ساعت‌ها قیمت تازه نداشته باشد
    const at = row.timestamp ? Math.round(Number(row.timestamp) * 1000) : Date.now();
    if (Date.now() - at > maxAgeMs) continue;

    rates[symbol.toLowerCase()] = {
      sell,
      unit: "IRT",
      changePercent: round(num(row.daily_change_price), 2),
      dayLow: num(row.low) || null,
      dayHigh: num(row.high) || null,
      at,
    };
  }

  if (!Object.keys(rates).length) throw new Error("هیچ نرخ تازه‌ای از بیت‌پین دریافت نشد");
  return rates;
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
