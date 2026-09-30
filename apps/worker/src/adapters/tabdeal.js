import { fetchJson, fetchText } from "../lib/http.js";
import { log } from "../lib/log.js";

/**
 * صرافی تبدیل (tabdeal.org).
 *
 * - رمزارز: GET /r/plots/market_information/ — همه‌ی بازارها در یک درخواست:
 *     [{ symbol: "BTC_IRT", price, open, high, low }, ...] به تومان
 * - ارز: صفحه‌ی عمومی /live/currency (دلار، یورو، پوند، درهم). داده در
 *   __NUXT_DATA__ صفحه است: آرایه‌ای که مقدار هر کلید شیء، اندیسِ خانه‌ی دیگری
 *   از همان آرایه است: { price_title: 8, last_price: 9, is_rial: 11 } ← "دلار"، "253800"، false
 *
 * اگر یکی از دو بخش خطا بدهد، بخش دیگر همچنان برمی‌گردد.
 */
const DEFAULT_CRYPTO = ["BTC", "ETH", "USDT", "SOL", "TON", "DOGE", "XRP", "BNB", "ADA", "TRX"];
const FIAT_TITLES = { دلار: "USD", یورو: "EUR", پوند: "GBP", درهم: "AED" };

export async function fetchTabdeal(source) {
  const config = source.config || {};
  const rates = {};
  const errors = [];

  try {
    Object.assign(rates, await crypto(source, config));
  } catch (error) {
    errors.push(`رمزارز: ${error.message}`);
  }
  try {
    Object.assign(rates, await fiat(config));
  } catch (error) {
    errors.push(`ارز: ${error.message}`);
  }

  if (errors.length) log.warn(`[tabdeal] ${errors.join(" | ")}`);
  if (!Object.keys(rates).length) throw new Error(errors.join(" | ") || "هیچ نرخی از تبدیل دریافت نشد");
  return rates;
}

async function crypto(source, config) {
  const symbols = (config.symbols?.length ? config.symbols : DEFAULT_CRYPTO).map((s) => s.toUpperCase());
  const list = await fetchJson(source.endpoint || "https://api1.tabdeal.org/r/plots/market_information/", {
    headers: { Accept: "application/json" },
    timeoutMs: config.timeoutMs || 12000,
  });
  if (!Array.isArray(list)) throw new Error("پاسخ نامعتبر");

  const bySymbol = new Map(list.map((row) => [row.symbol, row]));
  const rates = {};
  for (const symbol of symbols) {
    const row = bySymbol.get(`${symbol}_IRT`);
    const sell = num(row?.price);
    if (!sell) continue;
    const open = num(row.open);
    rates[symbol.toLowerCase()] = {
      sell,
      unit: "IRT",
      changePercent: open ? round(((sell - open) / open) * 100, 2) : 0,
      dayLow: num(row.low) || null,
      dayHigh: num(row.high) || null,
    };
  }
  return rates;
}

async function fiat(config) {
  const html = await fetchText(config.currencyPage || "https://tabdeal.org/live/currency", {
    headers: { "Accept-Language": "fa-IR,fa;q=0.9" },
    timeoutMs: config.timeoutMs || 15000,
  });
  const match = /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match) throw new Error("داده‌ی صفحه پیدا نشد؛ ساختار صفحه تغییر کرده است");

  const data = JSON.parse(match[1]);
  const rates = {};
  for (const node of data) {
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;
    if (!("price_title" in node) || !("last_price" in node)) continue;
    const title = String(data[node.price_title] ?? "").trim();
    const symbol = FIAT_TITLES[title];
    const price = num(data[node.last_price]);
    if (!symbol || !price) continue;
    const isRial = data[node.is_rial] === true;
    rates[symbol.toLowerCase()] = {
      sell: isRial ? price / 10 : price,
      unit: "IRT",
      changePercent: round(num(data[node.price_change]), 2),
    };
  }
  if (!Object.keys(rates).length) throw new Error("هیچ ارزی در صفحه پیدا نشد");
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
