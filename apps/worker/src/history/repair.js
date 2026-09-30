import { createRequire } from "node:module";
import { log } from "../lib/log.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

/**
 * پاک‌سازی تاریخچه‌ی دلار از نقطه‌های خراب.
 *
 * نمونه: شب ۷ مهر پست اشتباه یک کانال (۱۱۱ هزار) دلار را از ۲۳:۳۴ تا ۰۰:۵۵
 * حدود ۱۹۰ هزار نشان داد و کف کندل آن روز هم خراب شد. معیار، تتر است که هم‌زمان
 * از چند صرافی زنده بوده: نقطه‌ای از دلار که بیش از BAND با تترِ همان لحظه
 * فاصله دارد حذف می‌شود و کندل روزهای آسیب‌دیده از نقطه‌های سالم دوباره ساخته
 * می‌شود. تکرارپذیر است؛ اجرای دوباره چیزی را دوباره حذف نمی‌کند.
 */
const TARGETS = ["USD", "USD_HERAT"];
const BAND = 0.1;
/** نزدیک‌ترین نقطه‌ی تتر باید در این فاصله‌ی زمانی باشد */
const MATCH_MS = 30 * 60 * 1000;

export async function repairDollarHistory({ days = 30 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const usdt = await prisma.asset.findUnique({ where: { symbol: "USDT" }, select: { id: true } });
  if (!usdt) return { removed: 0 };

  const reference = await prisma.rateHistory.findMany({
    where: { assetId: usdt.id, at: { gte: since } },
    orderBy: { at: "asc" },
    select: { at: true, sell: true },
  });
  if (reference.length < 10) return { removed: 0 };
  const times = reference.map((point) => point.at.getTime());

  let removed = 0;
  for (const symbol of TARGETS) {
    const asset = await prisma.asset.findUnique({ where: { symbol }, select: { id: true } });
    if (!asset) continue;

    const points = await prisma.rateHistory.findMany({
      where: { assetId: asset.id, at: { gte: since } },
      select: { id: true, at: true, sell: true },
    });

    const bad = [];
    const days = new Set();
    for (const point of points) {
      const ref = nearest(reference, times, point.at.getTime());
      if (!ref) continue;
      if (Math.abs(point.sell - ref.sell) / ref.sell > BAND) {
        bad.push(point.id);
        days.add(tehranDate(point.at));
      }
    }
    if (!bad.length) continue;

    await prisma.rateHistory.deleteMany({ where: { id: { in: bad } } });
    removed += bad.length;
    for (const day of days) await rebuildCandle(asset.id, day);
    log.warn(`[repair] ${symbol}: ${bad.length} نقطه‌ی خراب تاریخچه حذف شد (روزها: ${[...days].join("، ")})`);
  }
  return { removed };
}

/** نزدیک‌ترین نقطه‌ی مرجع (جست‌وجوی دودویی) */
function nearest(reference, times, t) {
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  const candidates = [lo - 1, lo].filter((i) => i >= 0 && i < times.length);
  let best = null;
  for (const i of candidates) {
    const gap = Math.abs(times[i] - t);
    if (gap <= MATCH_MS && (!best || gap < best.gap)) best = { gap, point: reference[i] };
  }
  return best?.point ?? null;
}

/** «YYYY-MM-DD» به وقت تهران — همان روزی که کندل RateDaily دارد */
function tehranDate(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(date);
}

/** کندل یک روز از نقطه‌های سالمِ باقی‌مانده؛ کندل آرشیو TGJU دست نمی‌خورد */
async function rebuildCandle(assetId, day) {
  const rows = await prisma.$queryRaw`
    SELECT
      (array_agg(h."sell" ORDER BY h."at" ASC))[1]  AS open,
      max(h."sell") AS high,
      min(h."sell") AS low,
      (array_agg(h."sell" ORDER BY h."at" DESC))[1] AS close
    FROM "RateHistory" h
    WHERE h."assetId" = ${assetId}
      AND (h."at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tehran')::date = ${day}::date
  `;
  const row = rows[0];
  if (!row || row.close === null) return;
  await prisma.rateDaily.updateMany({
    where: { assetId, day: new Date(`${day}T00:00:00Z`), source: { in: ["live", "history"] } },
    data: {
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
    },
  });
}
