import { fetchText } from "../lib/http.js";

/**
 * بن‌بست — نرخ ارز بازار آزاد تهران.
 *
 * بن‌بست یک توکن یک‌بارمصرف داخل صفحه اصلی قرار می‌دهد و مسیر
 * POST /json فقط با آن توکن پاسخ می‌دهد. بنابراین دو مرحله لازم است:
 *   ۱) گرفتن صفحه اصلی و بیرون کشیدن توکن
 *   ۲) POST به /json با همان توکن
 *
 * خروجی بن‌بست تومانی است و فیلدها به شکل usd1 (فروش) و usd2 (خرید) هستند.
 */
export async function fetchBonbast(source) {
  const config = source.config || {};
  const base = (source.endpoint || "https://bonbast.com/").replace(/\/+$/, "");
  const timeoutMs = config.timeoutMs || 12000;

  const home = await fetchText(`${base}/`, {
    timeoutMs,
    headers: { "Accept-Language": "en-US,en;q=0.9,fa;q=0.8" },
  });

  const token = extractToken(home);
  if (!token) throw new Error("توکن بن‌بست پیدا نشد — ساختار صفحه تغییر کرده است");

  const body = await fetchText(`${base}/json`, {
    method: "POST",
    timeoutMs,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${base}/`,
    },
    body: new URLSearchParams({ param: token }).toString(),
  });

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("پاسخ /json بن‌بست قابل پارس نبود");
  }

  const rates = {};
  for (const [key, value] of Object.entries(payload)) {
    // فیلدهای فروش با پسوند ۱ و خرید با پسوند ۲ مشخص می‌شوند
    const match = /^([a-z]{3})1$/.exec(key);
    if (!match) continue;
    const symbol = match[1];
    const sell = toNumber(value);
    if (!sell) continue;
    const buy = toNumber(payload[`${symbol}2`]) || Math.round(sell * 0.99);
    rates[symbol] = { buy, sell, changePercent: 0 };
  }

  // سکه و طلا هم در همان پاسخ هستند
  const goldMap = {
    emami1: "emami",
    azadi1: "bahar",
    azadi1_2: "half",
    azadi1_4: "quarter",
    azadi1g: "grami",
    gol18: "gold18",
    ounce: "ounce",
  };
  for (const [key, symbol] of Object.entries(goldMap)) {
    const sell = toNumber(payload[key]);
    if (sell) rates[symbol] = { buy: Math.round(sell * 0.99), sell, changePercent: 0 };
  }

  if (!Object.keys(rates).length) throw new Error("هیچ نرخی از بن‌بست دریافت نشد");
  return rates;
}

function extractToken(html) {
  const patterns = [
    /\$\.post\(\s*['"]\/json['"]\s*,\s*\{\s*param\s*:\s*['"]([^'"]+)['"]/,
    /param\s*:\s*['"]([A-Za-z0-9_\-]{6,})['"]/,
    /name=["']param["'][^>]*value=["']([^"']+)["']/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) return match[1];
  }
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
