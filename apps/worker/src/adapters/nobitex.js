import { fetchJson } from "../lib/http.js";

/**
 * نوبیتکس — قیمت لحظه‌ای رمزارزها بر حسب ریال.
 *
 * پاسخ /market/stats به شکل زیر است:
 *   { status: "ok", stats: { "btc-rls": { bestSell, bestBuy, latest, dayChange, dayLow, dayHigh }, ... } }
 *
 * خروجی این آداپتور همیشه بر حسب واحد خام منبع (ریال) است؛
 * تبدیل به تومان با ضریب `multiplier` روی هر دارایی انجام می‌شود.
 */
export async function fetchNobitex(source) {
  const config = source.config || {};
  const dst = config.dstCurrency || "rls";
  const symbols = config.srcCurrencies?.length
    ? config.srcCurrencies
    : ["btc", "eth", "usdt", "sol", "ton", "doge", "xrp", "bnb", "ada", "trx"];

  const url = new URL(source.endpoint || "https://api.nobitex.ir/market/stats");
  url.searchParams.set("srcCurrency", symbols.join(","));
  url.searchParams.set("dstCurrency", dst);

  const payload = await fetchJson(url.toString(), {
    headers: { Accept: "application/json" },
    timeoutMs: config.timeoutMs || 12000,
  });

  if (!payload || payload.status !== "ok" || !payload.stats) {
    throw new Error("پاسخ نامعتبر از نوبیتکس");
  }

  // نرخ تتر برای محاسبه قیمت جهانی سایر رمزارزها
  const usdtRial = num(payload.stats[`usdt-${dst}`]?.latest);

  const rates = {};
  for (const symbol of symbols) {
    const stat = payload.stats[`${symbol}-${dst}`];
    if (!stat) continue;

    const sell = num(stat.bestSell) || num(stat.latest);
    const buy = num(stat.bestBuy) || sell;
    if (!sell) continue;

    rates[symbol] = {
      buy,
      sell,
      // dayChange درصد است و گاهی رشته برمی‌گردد
      changePercent: round(num(stat.dayChange), 2),
      dayLow: num(stat.dayLow) || null,
      dayHigh: num(stat.dayHigh) || null,
      globalPrice:
        symbol === "usdt" ? 1 : usdtRial ? round(sell / usdtRial, 4) : null,
    };
  }

  if (!Object.keys(rates).length) throw new Error("هیچ نرخی از نوبیتکس دریافت نشد");
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
