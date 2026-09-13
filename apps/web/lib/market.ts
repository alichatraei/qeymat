import { prisma } from "@qeymat/db";
import { cacheGet, cacheSet } from "./redis";
import type { HistoryPoint, MarketSnapshot, RateView } from "./types";

const SNAPSHOT_KEY = "qeymat:snapshot";

/**
 * اسنپ‌شات کامل بازار.
 * کرالر آن را در Redis می‌نویسد؛ اگر Redis در دسترس نبود مستقیم از دیتابیس خوانده می‌شود.
 */
export async function getSnapshot(): Promise<MarketSnapshot> {
  const cached = await cacheGet<MarketSnapshot>(SNAPSHOT_KEY);
  if (cached?.assets?.length) return cached;

  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: { rate: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const snapshot: MarketSnapshot = {
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
        buy: asset.rate!.buy,
        sell: asset.rate!.sell,
        changePercent: asset.rate!.changePercent,
        dayLow: asset.rate!.dayLow,
        dayHigh: asset.rate!.dayHigh,
        globalPrice: asset.rate!.globalPrice,
        fetchedAt: asset.rate!.fetchedAt.toISOString(),
      })),
  };

  await cacheSet(SNAPSHOT_KEY, snapshot, 30);
  return snapshot;
}

/**
 * اسنپ‌شات را برای کاربری که اشتراک پلاس ندارد می‌پوشاند.
 *
 * ردیف حذف نمی‌شود — عمداً. کاربر باید ببیند چه چیزی هست که نمی‌بیند،
 * وگرنه دلیلی برای خرید پیدا نمی‌کند. فقط اعداد صفر می‌شوند.
 */
export function maskSnapshot(snapshot: MarketSnapshot, hasPlus: boolean): MarketSnapshot {
  if (hasPlus) return snapshot;

  return {
    ...snapshot,
    assets: snapshot.assets.map((asset) =>
      asset.tier === "PLUS"
        ? {
            ...asset,
            buy: 0,
            sell: 0,
            changePercent: 0,
            dayLow: null,
            dayHigh: null,
            globalPrice: null,
            locked: true,
          }
        : asset,
    ),
  };
}

export async function getRate(symbol: string): Promise<RateView | null> {
  const snapshot = await getSnapshot();
  const upper = symbol.toUpperCase();
  return snapshot.assets.find((asset) => asset.symbol === upper) ?? null;
}

export async function getUsdRate(): Promise<number> {
  const usd = await getRate("USD");
  return usd?.sell ?? 0;
}

/**
 * تاریخچه قیمت برای نمودار.
 * @param range تعداد روز
 */
export async function getHistory(symbol: string, range = 7): Promise<HistoryPoint[]> {
  const asset = await prisma.asset.findUnique({ where: { symbol: symbol.toUpperCase() } });
  if (!asset) return [];

  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000);
  const rows = await prisma.rateHistory.findMany({
    where: { assetId: asset.id, at: { gte: since } },
    orderBy: { at: "asc" },
  });

  // برای بازه‌های بلند، به ازای هر روز یک نقطه (آخرین نرخ آن روز) نگه می‌داریم
  const byDay = new Map<string, { at: Date; sell: number }>();
  for (const row of rows) {
    const key = row.at.toISOString().slice(0, 10);
    byDay.set(key, { at: row.at, sell: row.sell });
  }

  const dense = range <= 2 ? rows.map((row) => ({ at: row.at, sell: row.sell })) : [...byDay.values()];

  const formatter = new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tehran",
  });
  const timeFormatter = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  });

  return dense.map((point) => ({
    at: point.at.toISOString(),
    label: range <= 2 ? timeFormatter.format(point.at) : formatter.format(point.at),
    value: point.sell,
  }));
}

/** وضعیت سلامت منابع، برای پنل مدیریت */
export async function getSources() {
  return prisma.source.findMany({ orderBy: { key: "asc" } });
}

/** خواندن یک تنظیم با مقدار پیش‌فرض */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as T) ?? fallback;
}
