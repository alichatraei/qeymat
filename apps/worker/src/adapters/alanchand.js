import * as cheerio from "cheerio";
import { fetchJson, fetchText } from "../lib/http.js";

/**
 * الان چند — نرخ ارزهای کاغذی بازار آزاد.
 *
 * سایت خروجی رسمی و پایدار ندارد، بنابراین دو مسیر امتحان می‌شود:
 *   ۱) اگر `config.apiEndpoint` تنظیم شده باشد، پاسخ JSON خوانده می‌شود.
 *   ۲) در غیر این صورت HTML صفحه اصلی پارس می‌شود.
 *
 * خروجی بر حسب تومان است (الان چند تومانی نمایش می‌دهد).
 */
export async function fetchAlanchand(source) {
  const config = source.config || {};

  if (config.apiEndpoint) {
    try {
      return await fromApi(config);
    } catch (error) {
      // اگر API اختصاصی جواب نداد، به HTML برمی‌گردیم
      console.warn("[alanchand] API failed, falling back to HTML:", error.message);
    }
  }

  return fromHtml(source, config);
}

async function fromApi(config) {
  const payload = await fetchJson(config.apiEndpoint, {
    method: config.method || "GET",
    headers: { Accept: "application/json", ...(config.headers || {}) },
    timeoutMs: config.timeoutMs || 12000,
  });

  const list = Array.isArray(payload) ? payload : payload?.[config.listKey || "currencies"];
  if (!Array.isArray(list)) throw new Error("ساختار پاسخ الان چند شناخته نشد");

  const rates = {};
  for (const item of list) {
    const slug = String(item.slug || item.code || item.symbol || "").toLowerCase();
    if (!slug) continue;
    const sell = toNumber(item.sell ?? item.price ?? item.p);
    if (!sell) continue;
    rates[slug] = {
      buy: toNumber(item.buy) || Math.round(sell * 0.99),
      sell,
      changePercent: toNumber(item.changePercent ?? item.dp),
    };
  }
  return rates;
}

/** نگاشت نام فارسی ارز به نماد داخلی */
const NAME_MAP = [
  [/دلار\s*آمریکا|دلار\s*امریکا|^دلار$/, "usd"],
  [/یورو/, "eur"],
  [/درهم/, "aed"],
  [/لیر\s*ترکیه|لیر/, "try"],
  [/پوند/, "gbp"],
  [/دلار\s*کانادا/, "cad"],
  [/ین\s*ژاپن|ین/, "jpy"],
  [/یوان/, "cny"],
  [/روبل/, "rub"],
  [/دینار\s*عراق/, "iqd"],
  [/فرانک/, "chf"],
  [/دلار\s*استرالیا/, "aud"],
  [/ریال\s*عربستان|ریال\s*سعودی/, "sar"],
  [/روپیه\s*هند/, "inr"],
  [/رینگیت/, "myr"],
];

function symbolFor(text) {
  const clean = text.replace(/\u200c/g, " ").replace(/\s+/g, " ").trim();
  for (const [pattern, symbol] of NAME_MAP) {
    if (pattern.test(clean)) return symbol;
  }
  return null;
}

async function fromHtml(source, config) {
  const html = await fetchText(source.endpoint || "https://alanchand.com/", {
    timeoutMs: config.timeoutMs || 12000,
    headers: {
      "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
    },
  });

  const $ = cheerio.load(html);
  const rates = {};

  // ساختار سایت: هر ردیف قیمت یک لینک/ردیف با نام فارسی و عدد است.
  $("table tr, .currency-row, li, a").each((_, element) => {
    const node = $(element);
    const text = node.text().replace(/\u200c/g, " ").replace(/\s+/g, " ").trim();
    if (!text || text.length > 160) return;

    const symbol = symbolFor(text);
    if (!symbol || rates[symbol]) return;

    // اعداد چهار رقم به بالا با جداکننده هزارگان
    const numbers = text
      .match(/[\d۰-۹,٬]{4,}/g)
      ?.map(toNumber)
      .filter((value) => value > 500);

    if (!numbers?.length) return;

    const sell = numbers[0];
    const buy = numbers[1] && numbers[1] < sell * 1.2 ? numbers[1] : Math.round(sell * 0.99);

    const changeMatch = text.match(/([-+−]?\s*[\d۰-۹.٫]+)\s*%|٪\s*([-+−]?[\d۰-۹.٫]+)/);
    rates[symbol] = {
      buy,
      sell,
      changePercent: changeMatch ? toNumber(changeMatch[1] || changeMatch[2]) : 0,
    };
  });

  if (!Object.keys(rates).length) {
    throw new Error("هیچ نرخی از الان چند استخراج نشد — ساختار صفحه تغییر کرده است");
  }

  return rates;
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/[،٬,\s]/g, "")
    .replace(/−/g, "-");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
