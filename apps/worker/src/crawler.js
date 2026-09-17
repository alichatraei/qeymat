import { createRequire } from "node:module";
import { fetchNobitex } from "./adapters/nobitex.js";
import { fetchAlanchand } from "./adapters/alanchand.js";
import { fetchBonbast } from "./adapters/bonbast.js";
import { fetchTgju } from "./adapters/tgju.js";
import { fetchTwelveData } from "./adapters/twelvedata.js";
import { fetchTelegram } from "./adapters/telegram.js";
import { fetchCustomJson } from "./adapters/custom-json.js";
import { aggregateAll } from "./aggregate.js";
import { cache, publish } from "./lib/cache.js";
import { checkAlerts } from "./alerts.js";
import { log } from "./lib/log.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

const ADAPTERS = {
  nobitex: fetchNobitex,
  alanchand: fetchAlanchand,
  bonbast: fetchBonbast,
  tgju: fetchTgju,
  twelvedata: fetchTwelveData,
  telegram: fetchTelegram,
  "custom-json": fetchCustomJson,
};

const HISTORY_INTERVAL_MS =
  Number(process.env.HISTORY_INTERVAL_MINUTES || 15) * 60 * 1000;
const lastHistoryAt = new Map();

/**
 * یک منبع را اجرا می‌کند و نقل‌قول‌هایش را ثبت می‌کند.
 * نرخ نهایی اینجا ساخته نمی‌شود — آن کارِ موتور اجماع است.
 */
export async function runSource(sourceKey) {
  const source = await prisma.source.findUnique({ where: { key: sourceKey } });
  if (!source) throw new Error(`منبع ${sourceKey} پیدا نشد`);
  if (!source.isActive) return { skipped: true };

  const adapter = ADAPTERS[source.adapter];
  if (!adapter) throw new Error(`آداپتور ${source.adapter} پشتیبانی نمی‌شود`);

  const startedAt = Date.now();
  try {
    const rates = await adapter(source);
    const latencyMs = Date.now() - startedAt;
    const stored = await storeQuotes(source, rates);

    await prisma.source.update({
      where: { id: source.id },
      data: {
        status: latencyMs > (source.intervalSec * 1000) / 2 ? "SLOW" : "ONLINE",
        lastFetchedAt: new Date(),
        lastLatencyMs: latencyMs,
        lastError: null,
      },
    });

    log.info(`[${source.key}] ${stored} نقل‌قول در ${latencyMs}ms`);
    return { stored, latencyMs };
  } catch (error) {
    await prisma.source.update({
      where: { id: source.id },
      data: {
        status: "DOWN",
        lastError: String(error?.message || error).slice(0, 500),
        lastLatencyMs: Date.now() - startedAt,
      },
    });
    log.error(`[${source.key}] خطا: ${error?.message || error}`);
    throw error;
  }
}

/** نقل‌قول‌های خام یک منبع را ثبت می‌کند */
async function storeQuotes(source, rates) {
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    select: {
      id: true,
      symbol: true,
      sourceField: true,
      multiplier: true,
      sourceKey: true,
    },
  });

  // برخی منابع قیمت دلاری می‌دهند و باید در نرخ روز دلار ضرب شوند
  let usdToman = 0;
  if (Object.values(rates).some((rate) => rate?.usdQuoted)) {
    const usd = await prisma.asset.findUnique({
      where: { symbol: "USD" },
      include: { rate: true },
    });
    usdToman = usd?.rate?.sell || 0;
    if (!usdToman)
      log.warn(`[${source.key}] نرخ دلار موجود نیست، تبدیل تومانی رد شد`);
  }

  let stored = 0;

  for (const asset of assets) {
    // یک منبع می‌تواند نماد را با کلید خودش یا با نماد استاندارد بدهد
    const raw =
      rates[asset.sourceField] ||
      rates[asset.sourceField?.toLowerCase()] ||
      rates[asset.symbol.toLowerCase()];
    if (!raw?.sell) continue;

    const multiplier = raw.usdQuoted ? usdToman : asset.multiplier || 1;
    if (raw.usdQuoted && !usdToman) continue;

    const sell = Math.round(raw.sell * multiplier);
    const buy = raw.buy ? Math.round(raw.buy * multiplier) : null;
    if (!sell) continue;

    await prisma.sourceQuote.upsert({
      where: {
        assetId_sourceKey: { assetId: asset.id, sourceKey: source.key },
      },
      update: { buy, sell, at: new Date() },
      create: { assetId: asset.id, sourceKey: source.key, buy, sell },
    });
    stored += 1;
  }

  return stored;
}

/**
 * چرخه‌ی کامل: اجماع، تاریخچه، کش و هشدارها.
 * بعد از هر دور منابع صدا زده می‌شود.
 */
export async function settle() {
  const before = await prisma.rate.findMany({
    select: { assetId: true, sell: true },
  });
  const previousByAsset = new Map(before.map((row) => [row.assetId, row.sell]));

  await aggregateAll();

  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: { rate: true },
  });

  const touched = [];
  for (const asset of assets) {
    if (!asset.rate) continue;

    const previousSell = previousByAsset.get(asset.id) ?? null;
    if (previousSell !== asset.rate.sell) {
      touched.push({ asset, sell: asset.rate.sell, previousSell });
    }

    const last = lastHistoryAt.get(asset.id) || 0;
    if (Date.now() - last > HISTORY_INTERVAL_MS) {
      await prisma.rateHistory.create({
        data: { assetId: asset.id, buy: asset.rate.buy, sell: asset.rate.sell },
      });
      lastHistoryAt.set(asset.id, Date.now());
    }
  }

  await refreshCache();
  if (touched.length) {
    await checkAlerts(touched);
    await publish("qeymat:rates", { at: Date.now(), count: touched.length });
  }

  return touched.length;
}

/** اسنپ‌شات کامل بازار در Redis */
export async function refreshCache() {
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: { rate: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const snapshot = {
    updatedAt: new Date().toISOString(),
    assets: assets
      .filter((asset) => asset.rate)
      .map((asset) => ({
        symbol: asset.symbol,
        nameFa: asset.nameFa,
        nameEn: asset.nameEn,
        category: asset.category,
        tier: asset.tier,
        countryCode: asset.countryCode,
        mark: asset.mark,
        unit: asset.unit,
        sourceLabel: asset.sourceLabel,
        buy: asset.rate.buy,
        sell: asset.rate.sell,
        changePercent: asset.rate.changePercent,
        dayLow: asset.rate.dayLow,
        dayHigh: asset.rate.dayHigh,
        globalPrice: asset.rate.globalPrice,
        confidence: asset.rate.confidence,
        sourceCount: asset.rate.sourceCount,
        fetchedAt: asset.rate.fetchedAt,
      })),
  };

  await cache.set("qeymat:snapshot", JSON.stringify(snapshot), 300);
  return snapshot;
}

/** همه‌ی منابع را یک‌بار اجرا می‌کند و بعد اجماع می‌گیرد */
export async function runAll() {
  const sources = await prisma.source.findMany({ where: { isActive: true } });
  const results = [];

  for (const source of sources) {
    try {
      results.push({ key: source.key, ...(await runSource(source.key)) });
    } catch (error) {
      results.push({ key: source.key, error: String(error?.message || error) });
    }
  }

  const changed = await settle();
  return { sources: results, changed };
}
