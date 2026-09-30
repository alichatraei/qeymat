import { fetchText } from "../lib/http.js";
import { log } from "../lib/log.js";

/**
 * ارزدیجیتال (arzdigital.com) — دو صفحه‌ی عمومی فهرست، هر کدام یک درخواست:
 *
 * - /currencies/  جدول ۹۰ ارز. هر ردیف:
 *     <tr data-fiat-url=".../currencies/euro/"> … arz-fiats-table__price … arz-irt-price <span>۲۸۶,۸۵۰</span>
 *     … arz-fiat-change … <time datetime="2026-09-29T17:29:22.000Z">
 *   زمان هر ردیف همان زمان آخرین به‌روزرسانی آن ارز است (شب‌ها نرخ عصر می‌ماند).
 * - /coins/  جدول رمزارزها: <a … symbol='BTC'> … sortname='pricedollar' …
 *     arz-irt-price <span>۲۱,۵۰۴,۳۳۱,۴۹۱</span> … sortname='change1d' sortval='-0.07'
 *
 * صفحه‌ها سنگین‌اند (حدود ۷۰۰ کیلوبایت) و خودشان ۱۵ دقیقه کش می‌شوند؛ اجرای
 * هر ۵ دقیقه کافی است. اگر یکی از دو صفحه خطا بدهد، دیگری برمی‌گردد.
 */
const SLUG_TO_ISO = {
  "united-states-dollar": "USD", euro: "EUR", "iraqi-dinar": "IQD", "turkish-lira": "TRY",
  "united-arab-emirates-dirham": "AED", "afghan-afghani": "AFN", "pound-sterling": "GBP",
  "canadian-dollar": "CAD", "chinese-yuan": "CNY", "armenian-dram": "AMD", "omani-rial": "OMR",
  "russian-ruble": "RUB", "kuwaiti-dinar": "KWD", "australian-dollar": "AUD", "pakistani-rupee": "PKR",
  "saudi-riyal": "SAR", "swedish-krona": "SEK", "indian-rupee": "INR", "swiss-franc": "CHF",
  "japanese-yen": "JPY", "azerbaijani-manat": "AZN", "south-korean-won": "KRW", "georgian-lari": "GEL",
  "thai-baht": "THB", "qatari-rial": "QAR", "norwegian-krone": "NOK", "sovereign-bolivar": "VES",
  "danish-krone": "DKK", "ukrainian-hryvnia": "UAH", "malaysian-ringgit": "MYR", "brazilian-real": "BRL",
  "chilean-peso": "CLP", "czech-koruna": "CZK", "hong-kong-dollar": "HKD", "hungarian-forint": "HUF",
  "indonesian-rupiah": "IDR", "mexican-peso": "MXN", "new-zealand-dollar": "NZD", "philippine-peso": "PHP",
  "polish-zloty": "PLN", "singapore-dollar": "SGD", "new-taiwan-dollar": "TWD", "south-african-rand": "ZAR",
  "bulgarian-lev": "BGN", "croatian-kuna": "HRK", "mauritian-rupee": "MUR", "romanian-leu": "RON",
  "nigerian-naira": "NGN", "colombian-peso": "COP", "argentine-peso": "ARS", "peruvian-sol": "PEN",
  "vietnamese-dong": "VND", "bolivian-boliviano": "BOB", "albanian-lek": "ALL",
  "bosnia-herzegovina-convertible-mark": "BAM", "bangladeshi-taka": "BDT", "bahraini-dinar": "BHD",
  "bermudan-dollar": "BMD", "belarusian-ruble": "BYN", "costa-rican-colon": "CRC", "cuban-peso": "CUP",
  "dominican-peso": "DOP", "algerian-dinar": "DZD", "egyptian-pound": "EGP", "ghanaian-cedi": "GHS",
  "guatemalan-quetzal": "GTQ", "honduran-lempira": "HNL", "jamaican-dollar": "JMD", "jordanian-dinar": "JOD",
  "kenyan-shilling": "KES", "kyrgystani-som": "KGS", "cambodian-riel": "KHR", "kazakhstani-tenge": "KZT",
  "lebanese-pound": "LBP", "sri-lankan-rupee": "LKR", "moroccan-dirham": "MAD", "moldovan-leu": "MDL",
  "macedonian-denar": "MKD", "myanma-kyat": "MMK", "mongolian-tugrik": "MNT", "namibian-dollar": "NAD",
  "nicaraguan-cordoba": "NIO", "nepalese-rupee": "NPR", "panamanian-balboa": "PAB", "serbian-dinar": "RSD",
  "tunisian-dinar": "TND", "trinidad-and-tobago-dollar": "TTD", "ugandan-shilling": "UGX",
  "uruguayan-peso": "UYU", "uzbekistan-som": "UZS",
};
const DEFAULT_CRYPTO = ["BTC", "ETH", "USDT", "SOL", "TON", "DOGE", "XRP", "BNB", "ADA", "TRX"];

export async function fetchArzdigital(source) {
  const config = source.config || {};
  const base = (source.endpoint || "https://arzdigital.com").replace(/\/+$/, "");
  const rates = {};
  const errors = [];

  try {
    Object.assign(rates, parseFiats(await page(`${base}/currencies/`, config), config));
  } catch (error) {
    errors.push(`ارز: ${error.message}`);
  }
  try {
    Object.assign(rates, parseCoins(await page(`${base}/coins/`, config), config));
  } catch (error) {
    errors.push(`رمزارز: ${error.message}`);
  }

  if (errors.length) log.warn(`[arzdigital] ${errors.join(" | ")}`);
  if (!Object.keys(rates).length) throw new Error(errors.join(" | ") || "هیچ نرخی از ارزدیجیتال دریافت نشد");
  return rates;
}

function page(url, config) {
  return fetchText(url, {
    headers: { "Accept-Language": "fa-IR,fa;q=0.9" },
    timeoutMs: config.timeoutMs || 20000,
  });
}

export function parseFiats(html, config = {}) {
  const maxAgeMs = (config.maxAgeHours || 36) * 60 * 60 * 1000;
  const rates = {};
  const rows = html.matchAll(/<tr data-market-id="\d+" data-fiat-url="[^"]*\/currencies\/([a-z0-9-]+)\/"([\s\S]*?)<\/tr>/g);
  for (const [, slug, body] of rows) {
    const iso = SLUG_TO_ISO[slug];
    if (!iso) continue;
    const price = /arz-fiats-table__price"><b[^>]*><span class="arz-irt-price"[^>]*><span>([^<]+)<\/span>/.exec(body);
    const sell = toNumber(price?.[1]);
    if (!sell) continue;

    const time = /<time[^>]*datetime="([^"]+)"/.exec(body);
    const at = time ? Date.parse(time[1]) : Date.now();
    if (Number.isFinite(at) && Date.now() - at > maxAgeMs) continue;

    const change = /arz-fiat-change[^"]*"[\s\S]*?<span dir="auto">([^<]+)<\/span>/.exec(body);
    const down = /arz-fiat-change[^"]*todown/.test(body);
    const range = /arz-fiat-range__values([\s\S]*?)<\/td>/.exec(body);
    const bounds = range
      ? [...range[1].matchAll(/arz-irt-price"[^>]*><span>([^<]+)<\/span>/g)].map((m) => toNumber(m[1]))
      : [];

    rates[iso.toLowerCase()] = {
      sell,
      unit: "IRT",
      changePercent: (down ? -1 : 1) * Math.abs(toNumber(change?.[1])),
      dayLow: bounds[0] || null,
      dayHigh: bounds[1] || null,
      at: Number.isFinite(at) ? at : Date.now(),
    };
  }
  if (!Object.keys(rates).length) throw new Error("جدول ارزها پیدا نشد؛ ساختار صفحه تغییر کرده است");
  return rates;
}

export function parseCoins(html, config = {}) {
  const wanted = new Set((config.symbols?.length ? config.symbols : DEFAULT_CRYPTO).map((s) => s.toUpperCase()));
  const rates = {};
  // هر ردیف با دکمه‌ی خرید و نماد شروع می‌شود و قیمت تومانی بعد از قیمت دلاری می‌آید
  const rows = html.matchAll(
    /symbol='([A-Z0-9]+)'[\s\S]*?sortname='pricedollar'[\s\S]*?arz-irt-price"[^>]*><span>([^<]+)<\/span>[\s\S]*?sortname='change1d' sortval='([^']*)'/g,
  );
  for (const [, symbol, price, change] of rows) {
    if (!wanted.has(symbol) || rates[symbol.toLowerCase()]) continue;
    const sell = toNumber(price);
    if (!sell) continue;
    rates[symbol.toLowerCase()] = {
      sell,
      unit: "IRT",
      changePercent: Math.round(Number(change || 0) * 100) / 100,
    };
  }
  if (!Object.keys(rates).length) throw new Error("جدول رمزارزها پیدا نشد؛ ساختار صفحه تغییر کرده است");
  return rates;
}

/** «۲۱,۵۰۴,۳۳۱,۴۹۱» یا «193.47» ← عدد */
function toNumber(value) {
  if (!value) return 0;
  const normalized = String(value)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/[,٬،\s%٪]/g, "")
    .replace(/−/g, "-");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
