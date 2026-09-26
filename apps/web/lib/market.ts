import { prisma } from "@qeymat/db";
import { cacheGet, cacheSet } from "./redis";
import { CHART_RANGES, MAX_HISTORY_YEARS } from "@qeymat/shared";
import type { HistoryPoint, HistorySeries, MarketSnapshot, RateView } from "./types";

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
        featured: asset.featured,
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
        confidence: asset.rate!.confidence,
        sourceCount: asset.rate!.sourceCount,
        fetchedAt: asset.rate!.fetchedAt.toISOString(),
      })),
  };

  await cacheSet(SNAPSHOT_KEY, snapshot, 30);
  return snapshot;
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

type Interval = HistorySeries["interval"];

const DAY_MS = 24 * 60 * 60 * 1000;

const persian = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "UTC", ...options });

const LABELS = {
  time: new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }),
  day: persian({ day: "numeric", month: "long" }),
  dayYear: persian({ day: "numeric", month: "long", year: "numeric" }),
  month: persian({ month: "long", year: "numeric" }),
  year: persian({ year: "numeric" }),
};

/** کلید ماه/سال شمسی برای گروه‌بندی کندل‌ها */
const JALALI_PARTS = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
});

function jalaliKey(day: Date, interval: "month" | "year") {
  const parts = JALALI_PARTS.formatToParts(day);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return interval === "year" ? year : `${year}-${month.padStart(2, "0")}`;
}

/**
 * سری قیمت برای نمودار.
 *
 * - بازه‌ی «۱ روز» از نقاط ۱۵ دقیقه‌ای RateHistory ساخته می‌شود.
 * - بقیه از کندل‌های روزانه‌ی RateDaily؛ با دانه‌بندی ماهانه/سالانه
 *   کندل‌ها بر اساس ماه و سال **شمسی** جمع می‌شوند.
 * - هر دارایی تا ۱۰ سال، یا اگر کمتر دارد تا بیشترین تاریخچه‌ی موجود.
 */
export async function getSeries(
  symbol: string,
  rangeId = "1m",
  requestedInterval?: string | null,
): Promise<HistorySeries | null> {
  const asset = await prisma.asset.findUnique({ where: { symbol: symbol.toUpperCase() } });
  if (!asset) return null;

  const range = CHART_RANGES.find((item) => item.id === rangeId) ?? CHART_RANGES[2];
  const interval: Interval =
    range.id === "1d"
      ? "raw"
      : (["day", "month", "year"].includes(String(requestedInterval))
          ? (requestedInterval as Interval)
          : range.interval);

  const cacheKey = `qeymat:series:${asset.symbol}:${range.id}:${interval}`;
  const cached = await cacheGet<HistorySeries>(cacheKey);
  if (cached) return cached;

  const first = await prisma.rateDaily.findFirst({
    where: { assetId: asset.id },
    orderBy: { day: "asc" },
    select: { day: true },
  });
  const tenYearsAgo = new Date(Date.now() - MAX_HISTORY_YEARS * 366 * DAY_MS);
  const firstDay = first ? new Date(Math.max(first.day.getTime(), tenYearsAgo.getTime())) : null;
  const yearsAvailable = firstDay
    ? Math.min(MAX_HISTORY_YEARS, Math.round(((Date.now() - firstDay.getTime()) / (365.25 * DAY_MS)) * 10) / 10)
    : 0;

  let points: HistoryPoint[] = [];

  if (interval === "raw") {
    const rows = await prisma.rateHistory.findMany({
      where: { assetId: asset.id, at: { gte: new Date(Date.now() - DAY_MS) } },
      orderBy: { at: "asc" },
      select: { at: true, sell: true },
    });
    points = rows.map((row) => ({
      at: row.at.toISOString(),
      label: LABELS.time.format(row.at),
      value: row.sell,
    }));
  } else {
    const since = new Date(Math.max(Date.now() - range.days * DAY_MS, tenYearsAgo.getTime()));
    const rows = await prisma.rateDaily.findMany({
      where: { assetId: asset.id, day: { gte: since } },
      orderBy: { day: "asc" },
      select: { day: true, open: true, high: true, low: true, close: true },
    });

    if (interval === "day") {
      const withYear = range.days > 366;
      points = rows.map((row) => ({
        at: row.day.toISOString(),
        label: (withYear ? LABELS.dayYear : LABELS.day).format(row.day),
        value: row.close,
        open: row.open,
        high: row.high,
        low: row.low,
      }));
    } else {
      const groups = new Map<string, typeof rows>();
      for (const row of rows) {
        const key = jalaliKey(row.day, interval);
        const list = groups.get(key);
        if (list) list.push(row);
        else groups.set(key, [row]);
      }
      points = [...groups.values()].map((group) => {
        const last = group[group.length - 1];
        return {
          at: last.day.toISOString(),
          label: (interval === "year" ? LABELS.year : LABELS.month).format(group[0].day),
          value: last.close,
          open: group[0].open,
          high: Math.max(...group.map((row) => row.high)),
          low: Math.min(...group.map((row) => row.low)),
        };
      });
    }
  }

  const series: HistorySeries = {
    symbol: asset.symbol,
    nameFa: asset.nameFa,
    unit: asset.unit,
    range: range.id,
    interval,
    firstDay: firstDay?.toISOString() ?? null,
    yearsAvailable,
    points,
  };

  await cacheSet(cacheKey, series, interval === "raw" ? 60 : 300);
  return series;
}

/** سازگاری با کد قبلی: تاریخچه‌ی چندروزه به شکل نقطه‌ها */
export async function getHistory(symbol: string, range = 7): Promise<HistoryPoint[]> {
  const rangeId = range <= 1 ? "1d" : range <= 7 ? "1w" : range <= 31 ? "1m" : range <= 92 ? "3m" : "1y";
  return (await getSeries(symbol, rangeId))?.points ?? [];
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
