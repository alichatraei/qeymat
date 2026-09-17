import { createRequire } from "node:module";
import { log } from "./lib/log.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

/**
 * موتور اجماع — نرخ نهایی «قیمت» را از روی همه‌ی منابع می‌سازد.
 *
 * منطق در سه مرحله:
 *   ۱. نقل‌قول‌های تازه‌ی هر دارایی جمع می‌شوند.
 *   ۲. پرت‌ها با روش میانه و MAD حذف می‌شوند — یعنی اگر یک کانال تلگرام
 *      عدد اشتباه داد، در نرخ نهایی اثر نمی‌گذارد. علت انتخاب MAD به‌جای
 *      انحراف معیار این است که خودِ انحراف معیار با همان پرت آلوده می‌شود.
 *   ۳. از باقی‌مانده میانگین وزنی گرفته می‌شود؛ وزن هر منبع در ضریب
 *      تازگی‌اش ضرب می‌شود تا داده‌ی کهنه کم‌اثر شود.
 *
 * اگر اجماع ضعیف بود (اطمینان پایین)، نرخ قبلی حفظ می‌شود.
 * انتشار عدد مشکوک بدتر از انتشار عدد چند دقیقه قدیمی‌تر است.
 */

const QUOTE_TTL_MS = Number(process.env.QUOTE_TTL_MINUTES || 30) * 60 * 1000;
const MIN_CONFIDENCE = Number(process.env.MIN_CONFIDENCE || 0.35);
const OUTLIER_FACTOR = Number(process.env.OUTLIER_FACTOR || 3);

export async function aggregateAll() {
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    include: { rate: true },
  });

  const sources = await prisma.source.findMany({
    select: { key: true, weight: true },
  });
  const weightByKey = new Map(sources.map((s) => [s.key, s.weight ?? 1]));

  const cutoff = new Date(Date.now() - QUOTE_TTL_MS);
  const results = [];

  for (const asset of assets) {
    const quotes = await prisma.sourceQuote.findMany({
      where: { assetId: asset.id, at: { gte: cutoff } },
    });

    const outcome = consensus(quotes, weightByKey, asset.rate?.sell ?? null);
    if (!outcome) continue;

    if (outcome.confidence < MIN_CONFIDENCE && asset.rate) {
      log.warn(
        `[aggregate] ${asset.symbol}: اطمینان ${outcome.confidence.toFixed(2)} پایین است، نرخ قبلی حفظ شد`,
      );
      continue;
    }

    const previous = asset.rate?.sell ?? null;
    const changePercent = previous
      ? round(((outcome.sell - previous) / previous) * 100, 2)
      : (asset.rate?.changePercent ?? 0);

    const data = {
      buy: outcome.buy,
      sell: outcome.sell,
      changePercent,
      confidence: round(outcome.confidence, 3),
      sourceCount: outcome.used,
      source: "اجماع قیمت",
      fetchedAt: new Date(),
    };

    await prisma.rate.upsert({
      where: { assetId: asset.id },
      update: data,
      create: { assetId: asset.id, ...data },
    });

    results.push({ symbol: asset.symbol, ...outcome });
  }

  log.info(`[aggregate] ${results.length} نرخ اجماعی به‌روز شد`);
  return results;
}

/** اجماع روی نقل‌قول‌های یک دارایی */
function consensus(quotes, weightByKey, previousSell) {
  const points = quotes
    .filter((quote) => quote.sell > 0)
    .map((quote) => ({
      sell: quote.sell,
      buy: quote.buy ?? null,
      sourceKey: quote.sourceKey,
      weight: (weightByKey.get(quote.sourceKey) ?? 1) * freshness(quote.at),
    }))
    .filter((point) => point.weight > 0);

  if (!points.length) return null;

  // تک‌منبع: اجماعی در کار نیست، پس اطمینان پایین می‌ماند
  if (points.length === 1) {
    return {
      sell: Math.round(points[0].sell),
      buy: Math.round(points[0].buy ?? points[0].sell * 0.995),
      confidence: 0.4,
      used: 1,
      rejected: 0,
    };
  }

  const values = points.map((point) => point.sell);
  const med = median(values);
  const mad =
    median(values.map((value) => Math.abs(value - med))) || med * 0.001;

  const kept = points.filter(
    (point) => Math.abs(point.sell - med) <= OUTLIER_FACTOR * mad,
  );
  const pool = kept.length >= 2 ? kept : points;
  const rejected = points.length - pool.length;

  const totalWeight = pool.reduce((sum, point) => sum + point.weight, 0);
  const sell =
    pool.reduce((sum, point) => sum + point.sell * point.weight, 0) /
    totalWeight;

  const buyPoints = pool.filter((point) => point.buy);
  const buy = buyPoints.length
    ? buyPoints.reduce((sum, point) => sum + point.buy * point.weight, 0) /
      buyPoints.reduce((sum, point) => sum + point.weight, 0)
    : sell * 0.995;

  // پراکندگی نسبی: هرچه منابع به هم نزدیک‌تر، اطمینان بالاتر
  const dispersion = mad / (med || 1);
  const agreement = Math.max(0, 1 - dispersion * 40);
  const coverage = Math.min(1, pool.length / 3);
  let confidence = 0.35 * coverage + 0.65 * agreement;

  // جهش ناگهانی نسبت به نرخ قبلی، اطمینان را پایین می‌آورد
  if (previousSell) {
    const jump = Math.abs(sell - previousSell) / previousSell;
    if (jump > 0.08) confidence *= Math.max(0.2, 1 - jump * 4);
  }

  return {
    sell: Math.round(sell),
    buy: Math.round(buy),
    confidence: Math.min(1, Math.max(0, confidence)),
    used: pool.length,
    rejected,
  };
}

/** ضریب تازگی: خطی از ۱ تا ۰ در بازه‌ی TTL */
function freshness(at) {
  const age = Date.now() - new Date(at).getTime();
  if (age <= 0) return 1;
  if (age >= QUOTE_TTL_MS) return 0;
  return 1 - age / QUOTE_TTL_MS;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
