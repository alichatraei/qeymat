import { fetchJson } from "../lib/http.js";

/**
 * والکس — قیمت لحظه‌ای رمزارزها به تومان.
 *
 * GET /v1/markets → { result: { symbols: { "BTCTMN": { stats: {
 *   bidPrice, askPrice, lastPrice, "24h_ch", "24h_lowPrice", "24h_highPrice" } } } } }
 *
 * بازاری که معامله ندارد به‌جای عدد «-» برمی‌گرداند و نادیده گرفته می‌شود.
 * فروش = کمترین پیشنهاد فروش (ask) و خرید = بیشترین پیشنهاد خرید (bid)، مثل نوبیتکس.
 */
const DEFAULT_SYMBOLS = ["BTC", "ETH", "USDT", "SOL", "TON", "DOGE", "XRP", "BNB", "ADA", "TRX"];

export async function fetchWallex(source) {
  const config = source.config || {};
  const symbols = (config.symbols?.length ? config.symbols : DEFAULT_SYMBOLS).map((s) => s.toUpperCase());

  const payload = await fetchJson(source.endpoint || "https://api.wallex.ir/v1/markets", {
    headers: { Accept: "application/json" },
    timeoutMs: config.timeoutMs || 12000,
  });
  const markets = payload?.result?.symbols;
  if (!markets || typeof markets !== "object") throw new Error("پاسخ نامعتبر از والکس");

  const rates = {};
  for (const symbol of symbols) {
    const stats = markets[`${symbol}TMN`]?.stats;
    if (!stats) continue;

    const ask = num(stats.askPrice);
    const bid = num(stats.bidPrice);
    const last = num(stats.lastPrice);
    const sell = ask || last;
    if (!sell) continue;

    rates[symbol.toLowerCase()] = {
      sell,
      buy: bid && bid <= sell ? bid : null,
      unit: "IRT",
      changePercent: round(num(stats["24h_ch"]), 2),
      dayLow: num(stats["24h_lowPrice"]) || null,
      dayHigh: num(stats["24h_highPrice"]) || null,
    };
  }

  if (!Object.keys(rates).length) throw new Error("هیچ نرخی از والکس دریافت نشد");
  return rates;
}

/** «-» یا خالی ← صفر */
function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
