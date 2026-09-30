import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import {
  isSane,
  isSummaryLine,
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
 * t.me از داخل ایران فیلتر است، پس درخواست‌ها از رله‌ی Cloudflare Worker
 * (مثلاً https://tg.qeymat.online/<channel>) می‌گذرند. آدرس و توکن رله در
 * زمان اجرا از متغیرهای محیطی TELEGRAM_RELAY_URL و TELEGRAM_RELAY_TOKEN
 * خوانده می‌شوند و بر کانفیگ دیتابیس مقدم‌اند — توکن هرگز در دیتابیس
 * ذخیره نمی‌شود.
 *
 * config نمونه:
 * {
 *   "maxPosts": 20,
 *   "maxAgeMinutes": 180,
 *   "channels": [
 *     { "name": "Price33", "weight": 1 },
 *     // کانالی که پست‌هایش برچسب ندارد: «103,300,000⏳باحواله🔵خرید»
 *     { "name": "Qeymatabshodeh", "weight": 0.9, "defaultSymbol": "ABSHODEH" }
 *   ]
 * }
 */
export async function fetchTelegram(source) {
  const config = source.config || {};
  const baseUrl = (
    process.env.TELEGRAM_RELAY_URL ||
    config.baseUrl ||
    "https://t.me/s"
  ).replace(/\/+$/, "");
  const token = process.env.TELEGRAM_RELAY_TOKEN || config.relayToken || "";
  const channels = config.channels?.length ? config.channels : [];
  const maxPosts = config.maxPosts || 20;
  const maxAgeMs = (config.maxAgeMinutes || 180) * 60 * 1000;

  if (!channels.length) throw new Error("هیچ کانالی در کانفیگ تعریف نشده است");

  /** @type {Record<string, {buy: {value:number, weight:number, at:number}[], sell: {value:number, weight:number, at:number}[]}>} */
  const collected = {};
  const errors = [];
  let postsSeen = 0;

  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      const spec = typeof channel === "string" ? { name: channel } : channel;
      const html = await fetchText(`${baseUrl}/${encodeURIComponent(spec.name)}`, {
        timeoutMs: config.timeoutMs || 15000,
        retries: 1,
        headers: {
          "Accept-Language": "fa-IR,fa;q=0.9",
          ...(token ? { "x-relay-token": token } : {}),
          ...(config.headers || {}),
        },
      });
      return { spec, posts: extractPosts(html, maxPosts, maxAgeMs) };
    }),
  );

  results.forEach((result, index) => {
    const channel = channels[index];
    const name = typeof channel === "string" ? channel : channel.name;
    if (result.status === "rejected") {
      errors.push(`${name}: ${result.reason?.message || result.reason}`);
      return;
    }

    const { spec, posts } = result.value;
    const weight = spec.weight ?? 1;
    postsSeen += posts.length;

    for (const post of posts) {
      // پست‌های تازه‌تر وزن بیشتری می‌گیرند
      const recency = Math.max(0.25, 1 - (Date.now() - post.at) / maxAgeMs);
      for (const [symbol, reading] of Object.entries(parsePost(post.text, spec))) {
        const bucket = (collected[symbol] ||= { buy: [], sell: [] });
        if (reading.sell) bucket.sell.push({ value: reading.sell, weight: weight * recency, at: post.at });
        if (reading.buy) bucket.buy.push({ value: reading.buy, weight: weight * recency, at: post.at });
      }
    }
  });

  const rates = {};
  for (const [symbol, raw] of Object.entries(collected)) {
    const bucket = { sell: trimOutliers(raw.sell), buy: trimOutliers(raw.buy) };
    const sell = weightedMedian(bucket.sell);
    const buy = weightedMedian(bucket.buy);
    if (!sell && !buy) continue;

    // فقط «خرید» اعلام شده؟ فروش کمی بالاتر است، نه برابر
    rates[symbol.toLowerCase()] = {
      buy: buy || Math.round(sell * 0.995),
      sell: sell || Math.round(buy * 1.005),
      unit: "IRT",
      samples: bucket.sell.length + bucket.buy.length,
      // زمان تازه‌ترین پستی که در این نرخ آمده؛ کانال‌ها شب پست نمی‌گذارند
      // و نرخ ساعت‌ها قبل نباید در اجماع تازه حساب شود
      at: Math.max(...bucket.sell.concat(bucket.buy).map((entry) => entry.at)),
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

/** پست‌های کانال را از HTML وب‌پرویو بیرون می‌کشد (تازه‌ترین‌ها اول) */
export function extractPosts(html, maxPosts = 20, maxAgeMs = Infinity) {
  const $ = cheerio.load(html);
  const posts = [];

  $(".tgme_widget_message_wrap").each((_, element) => {
    const node = $(element);
    const body = node.find(".tgme_widget_message_text").first();
    if (!body.length) return;

    // <br> در متن پست یعنی خط تازه؛ بدون این، همه‌ی خط‌ها به هم می‌چسبند
    body.find("br").replaceWith("\n");
    const text = body.text();
    if (!text?.trim()) return;

    // زمان پست از تگ time می‌آید؛ اگر نبود، پست را تازه فرض نمی‌کنیم
    const datetime = node.find("time[datetime]").last().attr("datetime");
    const at = datetime ? new Date(datetime).getTime() : 0;
    if (!at || Date.now() - at > maxAgeMs) return;

    posts.push({ text, at });
  });

  // وب‌پرویو قدیمی‌ترین را اول می‌آورد
  return posts.sort((a, b) => b.at - a.at).slice(0, maxPosts);
}

/**
 * یک پست را به نرخ‌ها تبدیل می‌کند.
 *
 * قالب‌های پوشش‌داده‌شده:
 *   «🔸دلار آمریکا : 231,400»              → برچسب و عدد در یک خط
 *   «💰 #آبشده_نقدی 104,700,000 فروش♦️»    → برچسب، عدد و جهت
 *   «دلار فردایی تهران ⏳ 230,422 فروش🔴»  → برچسب مرکب، عدد و جهت
 *   «103,300,000⏳باحواله🔵خرید»           → بی‌برچسب؛ نماد پیش‌فرض کانال
 *   «گرم: 23,846,899»                      → قیمت گرم طلای ۱۸
 */
export function parsePost(rawText, spec = {}) {
  const readings = {};
  const lines = stripNoise(rawText)
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (isSummaryLine(line)) continue;

    const side = sideFor(line);
    let symbol = symbolFor(line);

    // خط بی‌برچسب فقط وقتی پذیرفته می‌شود که جهت معامله را گفته باشد؛
    // وگرنه عددهای خلاصه‌ی روز هم به‌عنوان قیمت لحظه‌ای خوانده می‌شدند.
    if (!symbol && spec.defaultSymbol && side) symbol = spec.defaultSymbol;
    if (!symbol) continue;
    if (spec.only && !spec.only.includes(symbol)) continue;

    // عددهای چهاررقم به بالا؛ کمتر از آن قیمت نیست
    const numbers = (line.match(/\d[\d,]{3,}/g) || [])
      .map(toNumber)
      .filter((value) => isSane(symbol, value));
    if (!numbers.length) continue;

    // اگر چند عدد در خط بود، بزرگ‌ترین معمولاً قیمت است
    const value = Math.max(...numbers);

    const bucket = (readings[symbol] ||= {});
    if (side === "buy") bucket.buy ??= value;
    else bucket.sell ??= value; // فروش، معامله یا بدون برچسب
  }

  return readings;
}

/**
 * خوانشی که بیش از ۱۵٪ با میانه‌ی بقیه فاصله دارد کنار گذاشته می‌شود (فقط وقتی
 * دست‌کم سه خوانش هست). نمونه: پستی با «دلار آمریکا : 111,350» (نرخ مرکز
 * مبادله) کنار پست‌های بازار آزاد ۲۵۴ هزار تومانی.
 */
export function trimOutliers(entries) {
  if (!entries || entries.length < 3) return entries || [];
  const values = entries.map((entry) => entry.value).sort((a, b) => a - b);
  const mid = values[Math.floor(values.length / 2)];
  const kept = entries.filter((entry) => Math.abs(entry.value - mid) / mid <= 0.15);
  return kept.length ? kept : entries;
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
