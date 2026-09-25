import { createRequire } from "node:module";
import { fetchJson } from "../lib/http.js";
import { log } from "../lib/log.js";
import { isSane, isSaneHistory } from "../lib/parse-fa.js";
import { parseAnyDay, tehranDay } from "../lib/time.js";
import { TGJU_KEYS, tgjuNumber } from "../lib/tgju-map.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

/**
 * تاریخچه‌ی بلندمدت (تا ۱۰ سال) برای نمودارها.
 *
 * روش ۲ — بک‌فیل از آرشیو روزانه‌ی TGJU:
 *   https://api.tgju.org/v1/market/indicator/summary-table-data/<key>
 *   هر ردیف: [بازگشایی، کمترین، بیشترین، پایانی، تغییر، درصد، تاریخ میلادی، تاریخ شمسی]
 *   دارایی‌های دلاری (بیت‌کوین، نفت، …) با نرخ دلار همان روز تومانی می‌شوند.
 *
 * روش ۳ — درون‌ریزی CSV: ./import-csv.js
 *
 * هر دو فقط در جدول RateDaily می‌نویسند. ردیفی که از نرخ زنده‌ی خودمان
 * ساخته شده (source = live) هرگز بازنویسی نمی‌شود؛ منبع خودمان مقدم است.
 */

const MAX_YEARS = 10;
const PAGE = 4000;
const TGJU_HISTORY = "https://api.tgju.org/v1/market/indicator/summary-table-data";

/**
 * @param {{ symbols?: string[], force?: boolean }} options
 *   force=false فقط دارایی‌هایی را پر می‌کند که تاریخچه‌شان کمتر از یک سال است
 */
export async function backfillAll({ symbols, force = false } = {}) {
  const assets = await prisma.asset.findMany({
    where: { isActive: true, ...(symbols?.length ? { symbol: { in: symbols } } : {}) },
    select: { id: true, symbol: true },
  });
  const since = new Date(Date.now() - MAX_YEARS * 366 * 24 * 60 * 60 * 1000);

  // دلار باید اول بیاید چون تبدیل دارایی‌های دلاری به آن نیاز دارد
  const ordered = [...assets].sort((a, b) => (a.symbol === "USD" ? -1 : b.symbol === "USD" ? 1 : 0));
  let usdByDay = null;
  const report = [];

  for (const asset of ordered) {
    const spec = TGJU_KEYS[asset.symbol];
    if (!spec) continue;

    if (!force) {
      const count = await prisma.rateDaily.count({ where: { assetId: asset.id } });
      if (count >= 300 && asset.symbol !== "USD") {
        report.push({ symbol: asset.symbol, skipped: true, count });
        continue;
      }
    }

    try {
      const rows = await fetchTgjuDaily(spec.key, since);
      if (spec.unit === "USD") usdByDay ||= await loadUsdByDay();

      const candles = [];
      for (const row of rows) {
        let factor = 1;
        if (spec.unit === "IRR") factor = spec.factor ?? 0.1;
        else if (spec.unit === "USD") {
          const usd = nearestUsd(usdByDay, row.day);
          if (!usd) continue;
          factor = usd;
        }
        const candle = {
          assetId: asset.id,
          day: row.day,
          open: round(row.open * factor),
          high: round(row.high * factor),
          low: round(row.low * factor),
          close: round(row.close * factor),
          source: "tgju",
        };
        if (!isSaneHistory(asset.symbol, candle.close)) continue;
        candles.push(candle);
      }

      const created = await insertCandles(candles);
      if (asset.symbol === "USD") usdByDay = await loadUsdByDay();

      report.push({ symbol: asset.symbol, fetched: rows.length, created });
      log.info(`[backfill] ${asset.symbol}: ${created} روز تازه از ${rows.length} ردیف TGJU`);
    } catch (error) {
      report.push({ symbol: asset.symbol, error: String(error?.message || error) });
      log.warn(`[backfill] ${asset.symbol}: ${error?.message || error}`);
    }
  }

  // روزهای بی‌کندل را از تاریخچه‌ی زنده‌ی خودمان پر می‌کنیم
  const rolled = await rollupFromHistory();
  return { assets: report, rolledUp: rolled };
}

/** همه‌ی صفحه‌های تاریخچه‌ی یک کلید TGJU تا تاریخ since */
async function fetchTgjuDaily(key, since) {
  const rows = [];
  for (let start = 0; start < 20000; start += PAGE) {
    const url =
      `${TGJU_HISTORY}/${encodeURIComponent(key)}` +
      `?lang=fa&order_dir=desc&start=${start}&length=${PAGE}`;
    const payload = await fetchJson(url, {
      headers: { Accept: "application/json" },
      timeoutMs: 30000,
    });
    const data = Array.isArray(payload?.data) ? payload.data : [];
    if (!data.length) break;

    let reachedEnd = false;
    for (const cells of data) {
      const day = parseAnyDay(cells[6]) || parseAnyDay(cells[7]);
      if (!day) continue;
      if (day < since) {
        reachedEnd = true;
        break;
      }
      const open = tgjuNumber(cells[0]);
      const low = tgjuNumber(cells[1]);
      const high = tgjuNumber(cells[2]);
      const close = tgjuNumber(cells[3]);
      if (!close) continue;
      rows.push({
        day,
        open: open || close,
        low: Math.min(low || close, close),
        high: Math.max(high || close, close),
        close,
      });
    }

    if (reachedEnd || data.length < PAGE) break;
  }
  return rows;
}

/** درج دسته‌ای؛ ردیف موجود (به‌ویژه live) دست نمی‌خورد */
export async function insertCandles(candles) {
  let created = 0;
  for (let i = 0; i < candles.length; i += 1000) {
    const result = await prisma.rateDaily.createMany({
      data: candles.slice(i, i + 1000),
      skipDuplicates: true,
    });
    created += result.count;
  }
  return created;
}

async function loadUsdByDay() {
  const usd = await prisma.asset.findUnique({ where: { symbol: "USD" }, select: { id: true } });
  if (!usd) return new Map();
  const rows = await prisma.rateDaily.findMany({
    where: { assetId: usd.id },
    select: { day: true, close: true },
  });
  return new Map(rows.map((row) => [row.day.getTime(), row.close]));
}

/** نرخ دلار همان روز؛ برای تعطیلات، نزدیک‌ترین روز قبل (تا یک هفته) */
function nearestUsd(usdByDay, day) {
  for (let back = 0; back <= 7; back += 1) {
    const value = usdByDay.get(day.getTime() - back * 24 * 60 * 60 * 1000);
    if (value) return value;
  }
  return 0;
}

/**
 * کندل روزهایی که در RateDaily نیستند را از RateHistory (نقاط ۱۵ دقیقه‌ای
 * خودمان) می‌سازد. برای دارایی‌هایی که آرشیو بیرونی ندارند (دلار هرات،
 * سهام، …) تنها منبع تاریخچه همین است.
 */
export async function rollupFromHistory() {
  // به شکل رشته‌ی تاریخ تا مقایسه با ستون DATE تحت تأثیر منطقه‌ی زمانی نشود
  const today = tehranDay().toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw`
    SELECT
      h."assetId",
      (h."at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tehran')::date AS day,
      (array_agg(h."sell" ORDER BY h."at" ASC))[1]  AS open,
      max(h."sell") AS high,
      min(h."sell") AS low,
      (array_agg(h."sell" ORDER BY h."at" DESC))[1] AS close,
      a."symbol"
    FROM "RateHistory" h
    JOIN "Asset" a ON a."id" = h."assetId"
    WHERE (h."at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tehran')::date < ${today}::date
      AND NOT EXISTS (
        SELECT 1 FROM "RateDaily" d
        WHERE d."assetId" = h."assetId"
          AND d."day" = (h."at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tehran')::date
      )
    GROUP BY h."assetId", day, a."symbol"
  `;

  const candles = rows
    // تاریخچه‌ی نسخه‌ی قبل ممکن است نرخ ریالیِ اشتباه داشته باشد
    .filter((row) => isSane(row.symbol, Number(row.close)))
    .map((row) => ({
      assetId: row.assetId,
      day: new Date(row.day),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      source: "history",
    }));

  const created = await insertCandles(candles);
  if (created) log.info(`[rollup] ${created} کندل روزانه از تاریخچه‌ی زنده ساخته شد`);
  return created;
}

function round(value) {
  return value >= 100 ? Math.round(value) : Math.round(value * 10000) / 10000;
}
