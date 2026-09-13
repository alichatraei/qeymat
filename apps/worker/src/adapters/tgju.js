import { fetchJson } from "../lib/http.js";

/**
 * TGJU — نرخ طلا، سکه و انس جهانی.
 *
 * پاسخ ajax.json به شکل { "geram18": { p: "۳۴٬۰۰۰٬۰۰۰", d, dp, dt, ... }, ... } است
 * که قیمت‌ها ریالی و با جداکننده هزارگان هستند.
 */
const FIELD_ALIASES = {
  geram18: ["geram18", "gold_18", "gold18"],
  geram24: ["geram24", "gold_24", "gold24"],
  sekee: ["sekee", "sekeh_emami", "coin_emami"],
  sekeb: ["sekeb", "sekeh_bahar", "coin_bahar"],
  nim: ["nim", "sekeh_nim", "coin_half"],
  rob: ["rob", "sekeh_rob", "coin_quarter"],
  gerami: ["gerami", "sekeh_gerami", "coin_gerami"],
  ons: ["ons", "gold_ons", "ounce"],
  mesghal: ["mesghal", "mesghal_gold"],
};

export async function fetchTgju(source) {
  const config = source.config || {};
  const payload = await fetchJson(source.endpoint || "https://call5.tgju.org/ajax.json", {
    headers: { Accept: "application/json" },
    timeoutMs: config.timeoutMs || 12000,
  });

  const current = payload?.current || payload;
  if (!current || typeof current !== "object") throw new Error("پاسخ نامعتبر از TGJU");

  const rates = {};
  for (const [symbol, aliases] of Object.entries(FIELD_ALIASES)) {
    const entry = aliases.map((alias) => current[alias]).find(Boolean);
    if (!entry) continue;

    const sell = toNumber(entry.p ?? entry.price ?? entry.value);
    if (!sell) continue;

    const low = toNumber(entry.l ?? entry.low);
    const high = toNumber(entry.h ?? entry.high);

    rates[symbol] = {
      buy: low || Math.round(sell * 0.995),
      sell,
      changePercent: toNumber(entry.dp ?? entry.change_percent),
      dayLow: low || null,
      dayHigh: high || null,
    };

    // TGJU برای اکثر فیلدها با علامت d جهت تغییر را می‌دهد
    if (String(entry.dt || "").includes("low")) {
      rates[symbol].changePercent = -Math.abs(rates[symbol].changePercent);
    }
  }

  if (!Object.keys(rates).length) throw new Error("هیچ نرخی از TGJU دریافت نشد");
  return rates;
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/[،٬,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
