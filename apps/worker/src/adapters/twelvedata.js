import { fetchJson } from "../lib/http.js";

/**
 * Twelve Data — نفت، فلزات جهانی، سهام و شاخص‌ها.
 *
 * از endpoint گروهی /quote استفاده می‌شود که چند نماد را با یک درخواست
 * برمی‌گرداند. در پلن رایگان سقف درخواست در دقیقه پایین است، پس فاصله‌ی
 * زمان‌بندی این منبع را کوتاه‌تر از ۶۰ ثانیه نگذارید.
 *
 * قیمت‌ها دلاری‌اند. تبدیل به تومان با ضریب `multiplier` روی دارایی انجام
 * نمی‌شود چون نرخ دلار متغیر است؛ به‌جایش کرالر پس از دریافت، قیمت را در
 * نرخ روز دلار ضرب می‌کند (پرچم `usdQuoted` در config).
 */
export async function fetchTwelveData(source) {
  const config = source.config || {};
  const apiKey = process.env.TWELVE_DATA_API_KEY || config.apiKey;
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY تنظیم نشده است");

  const symbols = config.symbols?.length
    ? config.symbols
    : ["BRENTOIL/USD", "WTI/USD", "XAU/USD", "XAG/USD", "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL"];

  const url = new URL(source.endpoint || "https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbols.join(","));
  url.searchParams.set("apikey", apiKey);

  const payload = await fetchJson(url.toString(), {
    headers: { Accept: "application/json" },
    timeoutMs: config.timeoutMs || 15000,
  });

  if (payload?.status === "error") {
    throw new Error(payload.message || "پاسخ خطا از Twelve Data");
  }

  // با یک نماد پاسخ تخت است، با چند نماد شیئی کلید‌دار
  const entries =
    symbols.length === 1 ? { [symbols[0]]: payload } : payload;

  const rates = {};
  for (const [symbol, quote] of Object.entries(entries)) {
    if (!quote || quote.status === "error") continue;

    const close = num(quote.close ?? quote.price);
    if (!close) continue;

    // کلید داخلی بدون اسلش و با حروف کوچک: brentoil، xau، aapl
    const key = symbol.split("/")[0].toLowerCase();

    rates[key] = {
      buy: num(quote.previous_close) || close,
      sell: close,
      changePercent: round(num(quote.percent_change), 2),
      dayLow: num(quote.low) || null,
      dayHigh: num(quote.high) || null,
      // قیمت خام دلاری نگه داشته می‌شود تا در جدول هم قابل نمایش باشد
      globalPrice: close,
      usdQuoted: true,
    };
  }

  if (!Object.keys(rates).length) throw new Error("هیچ نرخی از Twelve Data دریافت نشد");
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
