import { fetchJson } from "../lib/http.js";

/**
 * آداپتور عمومی برای منابع JSON دلخواه که از پنل مدیریت اضافه می‌شوند.
 *
 * config نمونه:
 * {
 *   "listPath": "data.items",          // مسیر آرایه در پاسخ (اختیاری)
 *   "symbolKey": "code",
 *   "sellKey": "sell",
 *   "buyKey": "buy",
 *   "changeKey": "change_percent",
 *   "unit": "IRT",                     // IRT تومان · IRR ریال · USD دلار (کالاها)
 *   "headers": { "X-API-Key": "..." }
 * }
 *
 * بدون unit نرخ فقط برای دارایی‌هایی پذیرفته می‌شود که این منبع، منبع اصلی‌شان
 * باشد (ریسک ده‌برابر شدن نرخ ریالی).
 */
export async function fetchCustomJson(source) {
  const config = source.config || {};
  const payload = await fetchJson(source.endpoint, {
    method: config.method || "GET",
    headers: { Accept: "application/json", ...(config.headers || {}) },
    body: config.body ? JSON.stringify(config.body) : undefined,
    timeoutMs: config.timeoutMs || 12000,
  });

  const list = config.listPath ? getPath(payload, config.listPath) : payload;
  const rates = {};

  const symbolKey = config.symbolKey || "symbol";
  const sellKey = config.sellKey || "sell";
  const buyKey = config.buyKey || "buy";
  const changeKey = config.changeKey || "change";
  // «USD» یعنی قیمت دلاری؛ برای دارایی تومانی در نرخ دلار ضرب می‌شود
  const unit = config.unit === "USD" ? { usdQuoted: true } : config.unit ? { unit: String(config.unit).toUpperCase() } : {};

  if (Array.isArray(list)) {
    for (const item of list) {
      const symbol = String(getPath(item, symbolKey) ?? "").toLowerCase();
      const sell = toNumber(getPath(item, sellKey));
      if (!symbol || !sell) continue;
      rates[symbol] = {
        buy: toNumber(getPath(item, buyKey)) || Math.round(sell * 0.99),
        sell,
        changePercent: toNumber(getPath(item, changeKey)),
        ...unit,
      };
    }
  } else if (list && typeof list === "object") {
    for (const [key, item] of Object.entries(list)) {
      const sell = typeof item === "object" ? toNumber(getPath(item, sellKey)) : toNumber(item);
      if (!sell) continue;
      rates[key.toLowerCase()] = {
        buy: typeof item === "object" ? toNumber(getPath(item, buyKey)) || Math.round(sell * 0.99) : Math.round(sell * 0.99),
        sell,
        changePercent: typeof item === "object" ? toNumber(getPath(item, changeKey)) : 0,
        ...unit,
      };
    }
  }

  if (!Object.keys(rates).length) throw new Error(`هیچ نرخی از ${source.key} استخراج نشد`);
  return rates;
}

function getPath(object, path) {
  if (!path) return object;
  return String(path)
    .split(".")
    .reduce((accumulator, key) => (accumulator == null ? undefined : accumulator[key]), object);
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/[,٬\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
