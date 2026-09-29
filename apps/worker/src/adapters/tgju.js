import { fetchJson } from "../lib/http.js";
import { TGJU_KEYS, tgjuNumber } from "../lib/tgju-map.js";

/**
 * TGJU — ارز، طلا، سکه و انس جهانی.
 *
 * پاسخ ajax.json به شکل { current: { "geram18": { p: "241,246,000", h, l, dp, dt, ts }, ... } }
 * است و بیشتر قیمت‌ها ریالی‌اند. خروجی این آداپتور با نماد استاندارد و
 * از پیش به تومان تبدیل‌شده است (unit: "IRT")؛ جز انس که دلاری می‌ماند.
 *
 * نرخی که `ts` آن قدیمی‌تر از `maxAgeHours` باشد نادیده گرفته می‌شود — TGJU
 * برای بازار تعطیل آخرین نرخ روز قبل را برمی‌گرداند و نباید با نرخ تازه‌ی
 * منابع دیگر هم‌وزن شود.
 */
export async function fetchTgju(source) {
  const config = source.config || {};
  const payload = await fetchJson(source.endpoint || "https://call5.tgju.org/ajax.json", {
    headers: { Accept: "application/json" },
    timeoutMs: config.timeoutMs || 15000,
  });

  const current = payload?.current || payload;
  if (!current || typeof current !== "object") throw new Error("پاسخ نامعتبر از TGJU");

  const maxAgeMs = (config.maxAgeHours || 36) * 60 * 60 * 1000;
  const rates = {};

  // ارزهای جهان: هر کلید price_<کد> که در جدول صریح نیست، ریالی و برای یک واحد
  const specs = { ...TGJU_KEYS };
  for (const key of Object.keys(current)) {
    const match = /^price_([a-z]{3})$/.exec(key);
    if (!match) continue;
    const symbol = match[1].toUpperCase();
    if (!Object.values(TGJU_KEYS).some((spec) => spec.key === key) && !specs[symbol]) {
      specs[symbol] = { key, unit: "IRR", factor: 0.1 };
    }
  }

  for (const [symbol, base] of Object.entries(specs)) {
    if (base.live === false) continue;
    const spec = typeof base.live === "object" ? base.live : base;
    const entry = current[spec.key];
    if (!entry) continue;

    // ts به وقت تهران است: «2026-09-24 00:00:00»
    const at = entry.ts ? Date.parse(`${entry.ts.replace(" ", "T")}+03:30`) : Date.now();
    if (Number.isFinite(at) && Date.now() - at > maxAgeMs) continue;

    const factor = spec.unit === "IRR" ? spec.factor ?? 0.1 : 1;
    const sell = tgjuNumber(entry.p) * factor;
    if (!sell) continue;

    // قیمت دلاری (نفت، فلزات): ثبت نقل‌قول آن را در نرخ روز دلار ضرب می‌کند
    if (spec.unit === "USD") {
      rates[symbol.toLowerCase()] = {
        buy: Math.round(sell * 0.995 * 10000) / 10000,
        sell,
        usdQuoted: true,
        at,
      };
      continue;
    }

    const low = tgjuNumber(entry.l) * factor;
    const high = tgjuNumber(entry.h) * factor;
    let changePercent = tgjuNumber(entry.dp);
    if (String(entry.dt || "").includes("low")) changePercent = -Math.abs(changePercent);

    rates[symbol.toLowerCase()] = {
      buy: Math.round(sell * 0.995 * 100) / 100,
      sell: spec.unit === "RAW" ? sell : Math.round(sell),
      changePercent,
      dayLow: low || null,
      dayHigh: high || null,
      unit: spec.unit === "RAW" ? "RAW" : "IRT",
      at,
    };
  }

  if (!Object.keys(rates).length) throw new Error("هیچ نرخ تازه‌ای از TGJU دریافت نشد");
  return rates;
}
