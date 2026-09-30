import { fetchJson } from "../lib/http.js";

/**
 * نوسان (navasan.net) — از وب‌سرویس رسمی، نه از صفحه‌های سایت.
 *
 * نوسان عددهای صفحه‌ی اصلی را عمداً جابه‌جا در HTML می‌گذارد و با جاوااسکریپت
 * مرتب می‌کند، و به‌روزرسانی زنده‌ی صفحه‌ها توکن مبهم‌شده می‌خواهد؛ یعنی
 * نمی‌خواهد صفحه‌هایش خوانده شوند و وب‌سرویس پولی دارد. پس فقط از API با کلید:
 *
 *   GET https://api.navasan.tech/latest/?api_key=KEY
 *   → { "usd_sell": { "value": "253700", "change": -100, "timestamp": 1790700000, "date": "…" }, … }
 *
 * کلید فقط از NAVASAN_API_KEY خوانده می‌شود و در دیتابیس ذخیره نمی‌شود.
 * بسته‌های وب‌سرویس سقف درخواست ماهانه دارند؛ فاصله‌ی اجرا را در پنل مدیریت
 * متناسب با بسته تنظیم کنید (پیش‌فرض ۳۰ دقیقه ≈ ۱۴۴۰ درخواست در ماه).
 *
 * نگاشت کلیدهای نوسان به نماد «قیمت» در config.items قابل تغییر است.
 */
const DEFAULT_ITEMS = {
  usd_sell: "USD",
  usd_farda_sell: "USD_FARDA",
  harat_naghdi_sell: "USD_HERAT",
  eur: "EUR",
  aed_sell: "AED",
  dirham_dubai: "AED",
  gbp: "GBP",
  try: "TRY",
  cad: "CAD",
  cny: "CNY",
  sekkeh: "EMAMI",
  bahar: "BAHAR",
  nim: "HALF",
  rob: "QUARTER",
  gerami: "GRAMI",
  "18ayar": "GOLD18",
  abshodeh: "ABSHODEH",
};

export async function fetchNavasan(source) {
  const config = source.config || {};
  const key = process.env.NAVASAN_API_KEY;
  if (!key) throw new Error("NAVASAN_API_KEY در .env تنظیم نشده است");

  const url = new URL(source.endpoint || "https://api.navasan.tech/latest/");
  url.searchParams.set("api_key", key);
  const payload = await fetchJson(url.toString(), {
    headers: { Accept: "application/json" },
    timeoutMs: config.timeoutMs || 15000,
    retries: 0, // هر تلاش از سهمیه‌ی ماهانه کم می‌کند
  });
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("پاسخ نامعتبر از نوسان");
  }
  if (payload.error || payload.message) throw new Error(String(payload.error || payload.message).slice(0, 200));

  const items = { ...DEFAULT_ITEMS, ...(config.items || {}) };
  const maxAgeMs = (config.maxAgeHours || 36) * 60 * 60 * 1000;
  const rates = {};

  for (const [item, symbol] of Object.entries(items)) {
    const entry = payload[item];
    const sell = num(entry?.value);
    if (!sell) continue;
    const at = Number(entry.timestamp) > 0 ? Number(entry.timestamp) * 1000 : Date.now();
    if (Date.now() - at > maxAgeMs) continue;
    // دو کلید برای یک نماد (مثل درهم): تازه‌تر می‌ماند
    const current = rates[symbol.toLowerCase()];
    if (current && current.at >= at) continue;
    rates[symbol.toLowerCase()] = { sell, unit: "IRT", at };
  }

  if (!Object.keys(rates).length) throw new Error("هیچ نرخ شناخته‌شده‌ای در پاسخ نوسان نبود");
  return rates;
}

function num(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
