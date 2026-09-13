import { createRequire } from "node:module";
import { fetchNobitex } from "./adapters/nobitex.js";
import { fetchAlanchand } from "./adapters/alanchand.js";
import { fetchBonbast } from "./adapters/bonbast.js";
import { fetchTgju } from "./adapters/tgju.js";
import { fetchCustomJson } from "./adapters/custom-json.js";
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
  "custom-json": fetchCustomJson,
};

/** آخرین زمان ثبت تاریخچه برای هر دارایی (برای جلوگیری از رشد بی‌رویه جدول) */
const HISTORY_INTERVAL_MS = Number(process.env.HISTORY_INTERVAL_MINUTES || 15) * 60 * 1000;
const lastHistoryAt = new Map();

/**
 * یک منبع را اجرا می‌کند: داده می‌گیرد، روی دارایی‌های مربوطه می‌نشاند
 * و وضعیت سلامت منبع را به‌روز می‌کند.
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
    const updated = await applyRates(source, rates);

    await prisma.source.update({
      where: { id: source.id },
      data: {
        status: latencyMs > (source.intervalSec * 1000) / 2 ? "SLOW" : "ONLINE",
        lastFetchedAt: new Date(),
        lastLatencyMs: latencyMs,
        lastError: null,
      },
    });

    log.info(`[${source.key}] ${updated} نرخ در ${latencyMs}ms`);
    return { updated, latencyMs };
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

/** نرخ‌های خام یک منبع را روی دارایی‌های فعال آن منبع می‌نشاند. */
async function applyRates(source, rates) {
  const assets = await prisma.asset.findMany({
    where: { sourceKey: source.key, isActive: true },
    include: { rate: true },
  });

  const touched = [];

  for (const asset of assets) {
    const raw = rates[asset.sourceField] || rates[asset.sourceField?.toLowerCase()];
    if (!raw) continue;

    const multiplier = asset.multiplier || 1;
    const sell = round(raw.sell * multiplier);
    const buy = round((raw.buy ?? raw.sell) * multiplier);
    if (!sell) continue;

    const previous = asset.rate;
    // اگر منبع درصد تغییر نداد، از اختلاف با نرخ قبلی محاسبه می‌کنیم
    const changePercent =
      Number.isFinite(raw.changePercent) && raw.changePercent !== 0
        ? Number(raw.changePercent)
        : previous?.sell
          ? round(((sell - previous.sell) / previous.sell) * 100, 2)
          : 0;

    const data = {
      buy,
      sell,
      changePercent,
      dayLow: raw.dayLow ? round(raw.dayLow * multiplier) : previous?.dayLow ?? null,
      dayHigh: raw.dayHigh ? round(raw.dayHigh * multiplier) : previous?.dayHigh ?? null,
      globalPrice: raw.globalPrice ?? previous?.globalPrice ?? null,
      source: asset.sourceLabel,
      fetchedAt: new Date(),
    };

    await prisma.rate.upsert({
      where: { assetId: asset.id },
      update: data,
      create: { assetId: asset.id, ...data },
    });

    // تاریخچه فقط هر چند دقیقه یک‌بار
    const last = lastHistoryAt.get(asset.id) || 0;
    if (Date.now() - last > HISTORY_INTERVAL_MS) {
      await prisma.rateHistory.create({ data: { assetId: asset.id, buy, sell } });
      lastHistoryAt.set(asset.id, Date.now());
    }

    touched.push({ asset, sell, previousSell: previous?.sell ?? null });
  }

  if (touched.length) {
    await refreshCache();
    await checkAlerts(touched);
    await publish("qeymat:rates", { at: Date.now(), count: touched.length });
  }

  return touched.length;
}

/** یک اسنپ‌شات کامل از بازار را در Redis می‌گذارد تا وب بدون کوئری سنگین بخواند. */
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
        fetchedAt: asset.rate.fetchedAt,
      })),
  };

  await cache.set("qeymat:snapshot", JSON.stringify(snapshot), 300);
  return snapshot;
}

/** همه منابع فعال را یک‌بار اجرا می‌کند (برای اجرای دستی و اولین بوت). */
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
  await refreshCache();
  return results;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}
