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
      unit: "IRT",
      changePercent: toNumber(item.changePercent ?? item.dp),
    };
  }
  return rates;
}

/**
 * نگاشت نام فارسی ارز به نماد داخلی. نام کامل ردیف مقایسه می‌شود، نه
 * زیررشته — وگرنه «یوان چین» با «ین» و «دلار استانبول» با «دلار» اشتباه
 * گرفته می‌شد.
 */
const NAME_MAP = [
  [/^دلار\s*(آمریکا|امریکا)$/, "usd"],
  [/^یورو$/, "eur"],
  [/^درهم(\s*امارات)?$/, "aed"],
  [/^لیر\s*ترکیه$/, "try"],
  [/^پوند(\s*انگلیس)?$/, "gbp"],
  [/^دلار\s*کانادا$/, "cad"],
  [/^ین\s*ژاپن$/, "jpy"],
  [/^یوان(\s*چین)?$/, "cny"],
  [/^روبل(\s*روسیه)?$/, "rub"],
  [/^دینار\s*عراق$/, "iqd"],
  [/^دینار\s*کویت$/, "kwd"],
  [/^فرانک(\s*سوئیس)?$/, "chf"],
  [/^دلار\s*استرالیا$/, "aud"],
  [/^ریال\s*(عربستان|سعودی)$/, "sar"],
  [/^روپیه\s*هند$/, "inr"],
  [/^رینگیت(\s*مالزی)?$/, "myr"],
];

function symbolFor(name) {
  for (const [pattern, symbol] of NAME_MAP) {
    if (pattern.test(name)) return symbol;
  }
  return null;
}

/** «صد ین ژاپن» یعنی قیمت برای ۱۰۰ واحد */
function unitOf(name) {
  const match = /^(صد|هزار)\s+/.exec(name);
  if (!match) return { name, per: 1 };
  return { name: name.slice(match[0].length), per: match[1] === "صد" ? 100 : 1000 };
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

  // ساختار جدول: نام ارز | قیمت خرید | قیمت فروش | یک دلار چند؟
  $("table tr").each((_, element) => {
    const cells = $(element)
      .find("td")
      .map((__, cell) => $(cell).text().replace(/\u200c/g, " ").replace(/\s+/g, " ").trim())
      .get();
    if (cells.length < 3) return;

    const { name, per } = unitOf(cells[0].replace(/ي/g, "ی").replace(/ك/g, "ک"));
    const symbol = symbolFor(name);
    if (!symbol || rates[symbol]) return;

    const first = toNumber(cells[1]) / per;
    const second = toNumber(cells[2]) / per;
    if (!first && !second) return;

    // فروش همیشه بزرگ‌تر از خرید است؛ به ترتیب ستون‌ها تکیه نمی‌کنیم
    const sell = Math.max(first, second);
    const buy = Math.min(first, second) || Math.round(sell * 0.99);
    rates[symbol] = {
      buy: buy > sell * 0.9 ? buy : Math.round(sell * 0.99),
      sell,
      unit: "IRT",
      changePercent: 0,
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
