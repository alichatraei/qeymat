import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import {
  isSane,
  sideFor,
  stripNoise,
  symbolFor,
  toNumber,
} from "../lib/parse-fa.js";

/**
 * کانال‌های تلگرام — از طریق نسخه‌ی وب‌پرویو عمومی (t.me/s/<channel>).
 *
 * این مسیر نه حساب می‌خواهد نه ربات، فقط HTML عمومی کانال است.
 *
 * مهم: t.me از داخل ایران فیلتر است. برای سرور داخل ایران باید در کانفیگ
 * منبع، `baseUrl` را روی یک رله یا میرور تنظیم کنید؛ مثلاً:
 *   { "baseUrl": "https://relay.example.com/tg" }
 * رله باید مسیر /<channel> را بگیرد و HTML خام t.me/s/<channel> را برگرداند.
 *
 * config نمونه:
 * {
 *   "baseUrl": "https://t.me/s",
 *   "channels": [
 *     { "name": "Price33", "weight": 1 },
 *     { "name": "Qeymatabshodeh", "weight": 0.9 }
 *   ],
 *   "maxPosts": 25,
 *   "maxAgeMinutes": 120
 * }
 */
export async function fetchTelegram(source) {
  const config = source.config || {};
  const baseUrl = (config.baseUrl || "https://t.me/s").replace(/\/+$/, "");
  const channels = config.channels?.length ? config.channels : [];
  const maxPosts = config.maxPosts || 25;
  const maxAgeMs = (config.maxAgeMinutes || 120) * 60 * 1000;

  if (!channels.length) throw new Error("هیچ کانالی در کانفیگ تعریف نشده است");

  /** @type {Record<string, {values: number[], weights: number[], side: object}>} */
  const collected = {};
  const errors = [];
  let postsSeen = 0;

  for (const channel of channels) {
    const name = typeof channel === "string" ? channel : channel.name;
    const weight = typeof channel === "string" ? 1 : (channel.weight ?? 1);

    try {
      const html = await fetchText(`${baseUrl}/${encodeURIComponent(name)}`, {
        timeoutMs: config.timeoutMs || 15000,
        headers: {
          "Accept-Language": "fa-IR,fa;q=0.9",
          ...(config.headers || {}),
        },
      });

      const posts = extractPosts(html, maxPosts, maxAgeMs);
      postsSeen += posts.length;

      for (const post of posts) {
        for (const [symbol, reading] of Object.entries(parsePost(post.text))) {
          const bucket = (collected[symbol] ||= { buy: [], sell: [] });
          // پست‌های تازه‌تر وزن بیشتری می‌گیرند
          const recency = Math.max(0.3, 1 - (Date.now() - post.at) / maxAgeMs);
          if (reading.sell)
            bucket.sell.push({ value: reading.sell, weight: weight * recency });
          if (reading.buy)
            bucket.buy.push({ value: reading.buy, weight: weight * recency });
        }
      }
    } catch (error) {
      errors.push(`${name}: ${error?.message || error}`);
    }
  }

  const rates = {};
  for (const [symbol, bucket] of Object.entries(collected)) {
    const sell = weightedMedian(bucket.sell);
    const buy = weightedMedian(bucket.buy);
    if (!sell && !buy) continue;

    const final = sell || buy;
    rates[symbol.toLowerCase()] = {
      buy: buy || Math.round(final * 0.995),
      sell: sell || final,
      changePercent: 0, // کانال‌ها درصد تغییر نمی‌دهند؛ از نرخ قبلی محاسبه می‌شود
    };
  }

  if (!Object.keys(rates).length) {
    throw new Error(
      `از ${postsSeen} پست هیچ نرخی استخراج نشد` +
        (errors.length ? ` — ${errors.join(" | ")}` : ""),
    );
  }

  return rates;
}

/** پست‌های کانال را از HTML وب‌پرویو بیرون می‌کشد */
function extractPosts(html, maxPosts, maxAgeMs) {
  const $ = cheerio.load(html);
  const posts = [];

  $(".tgme_widget_message_wrap").each((_, element) => {
    if (posts.length >= maxPosts) return false;

    const node = $(element);
    const text = node.find(".tgme_widget_message_text").text();
    if (!text?.trim()) return;

    // زمان پست از تگ time می‌آید؛ اگر نبود، پست را تازه فرض نمی‌کنیم
    const datetime = node.find("time[datetime]").attr("datetime");
    const at = datetime ? new Date(datetime).getTime() : 0;
    if (!at || Date.now() - at > maxAgeMs) return;

    posts.push({ text, at });
  });

  return posts;
}

/**
 * یک پست را به نرخ‌ها تبدیل می‌کند.
 *
 * دو قالب رایج پوشش داده می‌شود:
 *   «🔸دلار آمریکا : 231,400»        → برچسب و عدد در یک خط
 *   «💰 #آبشده_نقدی 104,700,000 فروش» → برچسب، عدد، و جهت در یک خط
 */
function parsePost(rawText) {
  const readings = {};
  const lines = stripNoise(rawText)
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const symbol = symbolFor(line);
    if (!symbol) continue;

    // عددهای چهاررقم به بالا؛ کمتر از آن قیمت نیست
    const numbers = (line.match(/[\d,]{4,}/g) || [])
      .map(toNumber)
      .filter((value) => isSane(symbol, value));

    if (!numbers.length) continue;

    // اگر چند عدد در خط بود، بزرگ‌ترین معمولاً قیمت است
    // (اعداد کوچک‌تر اغلب درصد یا تعداد هستند)
    const value = Math.max(...numbers);
    const side = sideFor(line);

    const bucket = (readings[symbol] ||= {});
    if (side === "buy") bucket.buy = value;
    else if (side === "sell") bucket.sell = value;
    else bucket.sell ||= value; // بدون برچسب، فروش فرض می‌شود
  }

  return readings;
}

/**
 * میانه‌ی وزنی.
 * میانه را به میانگین ترجیح می‌دهیم چون در متن آزاد، یک عدد اشتباه
 * می‌تواند میانگین را کاملاً جابه‌جا کند ولی میانه را نه.
 */
function weightedMedian(entries) {
  if (!entries?.length) return 0;
  if (entries.length === 1) return Math.round(entries[0].value);

  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);

  let running = 0;
  for (const item of sorted) {
    running += item.weight;
    if (running >= total / 2) return Math.round(item.value);
  }
  return Math.round(sorted[sorted.length - 1].value);
}
