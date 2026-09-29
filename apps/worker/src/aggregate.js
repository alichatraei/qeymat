import { createRequire } from "node:module";
import { log } from "./lib/log.js";
import { isSane } from "./lib/parse-fa.js";
import { tehranDay } from "./lib/time.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

/**
 * موتور تحلیل و اجماع — نرخ نهایی «قیمت» را خودمان از روی همه‌ی منابع
 * (الان‌چند، TGJU، کانال‌های تلگرام، نوبیتکس، بن‌بست و …) می‌سازیم.
 *
 * مراحل برای هر دارایی:
 *   ۱. نقل‌قول‌های تازه جمع می‌شوند. وزن هر نقل‌قول =
 *        وزن دستی منبع × کیفیت یادگرفته‌ی منبع × ضریب تازگی
 *   ۲. پرت‌ها با میانه و MAD حذف می‌شوند (نه انحراف معیار — خودِ انحراف
 *      معیار با همان پرت آلوده می‌شود).
 *   ۳. از باقی‌مانده «میانگین هوبر» گرفته می‌شود: نزدیک میانه مثل میانگین
 *      وزنی رفتار می‌کند، ولی اثر نقاط دور را به‌تدریج کم می‌کند.
 *   ۴. اگر منابع مستقیم کم بودند، از روابط بین دارایی‌ها تخمین کمکی ساخته
 *      می‌شود (مثلاً مثقال آبشده = گرم طلای ۱۸ × ۴٫۳۳۱۸).
 *   ۵. محافظ جهش: تغییر بزرگ نسبت به نرخ قبلی فقط وقتی پذیرفته می‌شود که
 *      دست‌کم دو منبع مستقل آن را تأیید کنند. انتشار عدد مشکوک بدتر از
 *      انتشار عدد چند دقیقه قدیمی‌تر است.
 *   ۶. اطمینان (۰ تا ۱) از پوشش منابع، توافقشان و تازگی داده ساخته می‌شود.
 *   ۷. کیفیت هر منبع با فاصله‌ی نقل‌قول‌هایش از نرخ نهایی یاد گرفته می‌شود؛
 *      منبعی که مدام پرت می‌دهد کم‌کم وزنش را از دست می‌دهد.
 *
 * تغییر روز نسبت به «پایانی دیروز» (از جدول RateDaily) حساب می‌شود، نه
 * نسبت به تیک قبلی، و کندل امروز همین‌جا به‌روز می‌شود.
 */

const QUOTE_TTL_MS = Number(process.env.QUOTE_TTL_MINUTES || 30) * 60 * 1000;
const MIN_CONFIDENCE = Number(process.env.MIN_CONFIDENCE || 0.35);
const OUTLIER_FACTOR = Number(process.env.OUTLIER_FACTOR || 3);
/** نرخ یادگیری کیفیت منابع در هر دور */
const QUALITY_RATE = 0.02;
const QUALITY_FLOOR = 0.2;
/** وزن تخمین‌های حاصل از رابطه‌ی بین دارایی‌ها */
const DERIVED_WEIGHT = 0.35;
/** نرخ قبلیِ کهنه‌تر از این، مبنای محافظ جهش نیست (سیستم خاموش بوده یا نرخ اولیه‌ی seed است) */
const STALE_RATE_MS = 3 * 60 * 60 * 1000;
/** جهشی که با یک منبع تأیید شده، اگر این مدت در همان جهت بماند پذیرفته می‌شود */
const JUMP_HOLD_MS = Number(process.env.JUMP_HOLD_MINUTES || 10) * 60 * 1000;
/**
 * سقف نگه‌داشتن نرخ قبلی به‌خاطر اطمینان پایین. در بازار پرنوسان منابع از
 * هم فاصله می‌گیرند و اطمینان پایین می‌آید؛ بدون این سقف نرخ تا سه ساعت
 * (STALE_RATE_MS) ثابت می‌ماند، درست وقتی قیمت بیشترین تغییر را دارد.
 */
const LOW_CONFIDENCE_HOLD_MS = Number(process.env.LOW_CONFIDENCE_HOLD_MINUTES || 15) * 60 * 1000;

/** جهش‌های در انتظار تأیید: نماد ← { direction, since } */
const pendingJumps = new Map();
/** از چه زمانی اطمینان هر نماد پایین مانده: نماد ← زمان */
const lowConfidenceSince = new Map();

/** سقف جهش مجاز بدون تأیید دو منبع، بر حسب دسته */
const JUMP_LIMIT = {
  CURRENCY: 0.05,
  GOLD: 0.05,
  CRYPTO: 0.15,
  COMMODITY: 0.1,
  STOCK: 0.15,
  INDEX: 0.08,
};

/**
 * روابط بین دارایی‌ها: هدف ← [منبع، ضریب].
 * ۱ مثقال = ۴٫۳۳۱۸ گرم؛ طلای ۲۴ = طلای ۱۸ × ۲۴/۱۸.
 */
const RELATIONS = {
  GOLD18: [
    ["ABSHODEH", 1 / 4.3318],
    ["GOLD24", 18 / 24],
  ],
  GOLD24: [["GOLD18", 24 / 18]],
  ABSHODEH: [["GOLD18", 4.3318]],
};

export async function aggregateAll() {
  const [assets, sources] = await Promise.all([
    prisma.asset.findMany({ where: { isActive: true }, include: { rate: true } }),
    prisma.source.findMany({ select: { key: true, weight: true, quality: true, config: true } }),
  ]);
  // هر منبع می‌تواند پنجره‌ی تازگی خودش را داشته باشد (config.quoteTtlMinutes)؛
  // مثلاً TGJU ارزهای جهان را ساعتی یک‌بار به‌روز می‌کند
  for (const source of sources) {
    source.ttlMs = Number(source.config?.quoteTtlMinutes) * 60 * 1000 || QUOTE_TTL_MS;
  }
  const sourceByKey = new Map(sources.map((s) => [s.key, s]));
  const maxTtl = Math.max(QUOTE_TTL_MS, ...sources.map((s) => s.ttlMs));

  const quotes = await prisma.sourceQuote.findMany({
    where: { at: { gte: new Date(Date.now() - maxTtl) } },
  });
  const quotesByAsset = groupBy(quotes, (quote) => quote.assetId);

  // برای دارایی‌های بدون نرخ: نقل‌قول‌های قدیمی‌تر از پنجره‌ی تازگی (تا ۳۶ ساعت)
  const unrated = assets.filter((asset) => !asset.rate).map((asset) => asset.id);
  const staleQuotesByAsset = unrated.length
    ? groupBy(
        await prisma.sourceQuote.findMany({
          where: {
            assetId: { in: unrated },
            at: { gte: new Date(Date.now() - 36 * 60 * 60 * 1000) },
          },
        }),
        (quote) => quote.assetId,
      )
    : new Map();

  // ---- دور اول: فقط منابع مستقیم ----
  const direct = new Map();
  for (const asset of assets) {
    const points = toPoints(quotesByAsset.get(asset.id) || [], sourceByKey);
    const outcome = consensus(points);
    if (outcome) direct.set(asset.symbol, outcome);
  }

  // ---- کندل‌های امروز و دیروز برای تغییر روز و کف/سقف ----
  const today = tehranDay();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const [todayCandles, previousCloses] = await Promise.all([
    prisma.rateDaily.findMany({ where: { day: today } }),
    // آخرین کندل پیش از امروز؛ برای تعطیلات هم کار می‌کند
    prisma.$queryRaw`
      SELECT DISTINCT ON ("assetId") "assetId", "close"
      FROM "RateDaily"
      WHERE "day" <= ${yesterday.toISOString().slice(0, 10)}::date
      ORDER BY "assetId", "day" DESC
    `,
  ]);
  const candleByAsset = new Map(todayCandles.map((c) => [c.assetId, c]));
  // اولین کندل زنده‌ی امروز: کف و سقف از خود قیمت زنده شروع می‌شوند
  const prevCloseByAsset = new Map(previousCloses.map((row) => [row.assetId, Number(row.close)]));

  const usd = direct.get("USD")?.sell ?? assets.find((a) => a.symbol === "USD")?.rate?.sell;
  const usdt = direct.get("USDT")?.sell ?? assets.find((a) => a.symbol === "USDT")?.rate?.sell;

  const results = [];
  const errorsBySource = new Map();

  for (const asset of assets) {
    let own = toPoints(quotesByAsset.get(asset.id) || [], sourceByKey);
    if (!own.length && !asset.rate) {
      own = toPoints(staleQuotesByAsset.get(asset.id) || [], sourceByKey, 0.05);
    }

    // ---- دور دوم: تخمین کمکی از روابط، وقتی منابع مستقیم کم‌اند ----
    const derived = [];
    if (independentCount(own) < 2) {
      for (const [from, factor] of RELATIONS[asset.symbol] || []) {
        const base = direct.get(from);
        if (!base || base.used < 1) continue;
        derived.push({
          sell: base.sell * factor,
          buy: base.buy * factor,
          sourceKey: `derived:${from}`,
          weight: DERIVED_WEIGHT * base.confidence,
          derived: true,
        });
      }
    }

    const outcome = consensus([...own, ...derived]);
    if (!outcome) continue;

    // نرخ قبلی فقط وقتی مبنای مقایسه است که تازه و منطقی باشد؛ نرخ ماندهٔ
    // seed یا نرخ ده‌برابرِ نسخهٔ قبل نباید جلوی اصلاح را بگیرد.
    const previousAt = asset.rate?.fetchedAt ? new Date(asset.rate.fetchedAt).getTime() : 0;
    const previous =
      asset.rate?.sell && Date.now() - previousAt < STALE_RATE_MS && isSane(asset.symbol, asset.rate.sell)
        ? asset.rate.sell
        : null;
    const jump = previous ? Math.abs(outcome.sell - previous) / previous : 0;
    const limit = JUMP_LIMIT[asset.category] ?? 0.08;
    // اگر نرخ تازه با پایانی دیروز (آرشیو) سازگار است، جهش مال نرخ قبلیِ اشتباه است
    const lastClose = prevCloseByAsset.get(asset.id);
    const consistentWithClose =
      lastClose && Math.abs(outcome.sell - lastClose) / lastClose <= limit;

    if (previous && jump > limit && !consistentWithClose) {
      const confirmations = new Set(
        own
          .filter((point) => Math.abs(point.sell - outcome.sell) / outcome.sell < 0.015)
          .map((point) => point.sourceKey),
      ).size;
      if (confirmations < 2) {
        // جهش واقعی با یک منبع هم پذیرفته می‌شود، به شرط اینکه چند دقیقه در
        // همان جهت بماند. مقایسه‌ی عدد دقیق (مثلاً ±۱٪) در بازاری که پیوسته
        // بالا می‌رود هرگز «پایدار» نمی‌شد و نرخ ساعت‌ها ثابت می‌ماند.
        const direction = Math.sign(outcome.sell - previous);
        const pending = pendingJumps.get(asset.symbol);
        const steady = pending && pending.direction === direction;
        if (!steady) pendingJumps.set(asset.symbol, { direction, since: Date.now() });
        if (!steady || Date.now() - pending.since < JUMP_HOLD_MS) {
          log.warn(
            `[engine] ${asset.symbol}: جهش ${(jump * 100).toFixed(1)}٪ فقط با ${confirmations} منبع — در انتظار پایداری`,
          );
          continue;
        }
      }
      pendingJumps.delete(asset.symbol);
      outcome.confidence *= 0.85;
    } else {
      pendingJumps.delete(asset.symbol);
    }

    const previousOff =
      previous && lastClose && Math.abs(previous - lastClose) / lastClose > limit;
    if (outcome.confidence < MIN_CONFIDENCE && previous && !(consistentWithClose && previousOff)) {
      if (!lowConfidenceSince.has(asset.symbol)) lowConfidenceSince.set(asset.symbol, Date.now());
      const heldMs = Date.now() - lowConfidenceSince.get(asset.symbol);
      if (heldMs < LOW_CONFIDENCE_HOLD_MS) {
        // تک‌منبعِ کهنه‌شونده (مثل ارزهای جهان از TGJU) عادی است؛ فقط اختلاف منابع ارزش گزارش دارد
        if (outcome.used > 1)
          log.warn(
            `[engine] ${asset.symbol}: اطمینان ${outcome.confidence.toFixed(2)} پایین است، نرخ قبلی حفظ شد`,
          );
        continue;
      }
      // اطمینان مدتی است پایین مانده؛ از این به بعد نرخ تازه با همان اطمینان
      // پایین منتشر می‌شود تا وقتی منابع دوباره به توافق برسند
      if (outcome.used > 1)
        log.warn(
          `[engine] ${asset.symbol}: اطمینان ${outcome.confidence.toFixed(2)} از ${Math.round(heldMs / 60000)} دقیقه پیش پایین است؛ نرخ تازه منتشر شد`,
        );
    } else {
      lowConfidenceSince.delete(asset.symbol);
    }

    // ---- یادگیری کیفیت منابع: فاصله‌ی هر منبع از نرخ نهایی ----
    for (const point of own) {
      const error = Math.abs(point.sell - outcome.sell) / outcome.sell;
      const list = errorsBySource.get(point.sourceKey) || [];
      list.push(error);
      errorsBySource.set(point.sourceKey, list);
    }

    // ---- بدون تغییر؟ نوشتن در دیتابیس لازم نیست ----
    // با حدود ۱۷۰ دارایی و اجرای اجماع بعد از هر منبع، این شرط بار دیتابیس را چند برابر کم می‌کند
    const existingToday = candleByAsset.get(asset.id);
    if (
      asset.rate &&
      asset.rate.sell === outcome.sell &&
      asset.rate.buy === outcome.buy &&
      existingToday?.source === "live" &&
      existingToday.close === outcome.sell &&
      Date.now() - new Date(asset.rate.fetchedAt).getTime() < 10 * 60 * 1000
    ) {
      continue;
    }

    // ---- کندل امروز ----
    // کندلی که منبعش نرخ زنده‌ی خودمان نیست (مثلاً بک‌فیل) فقط مبنای «باز» است
    const existing = candleByAsset.get(asset.id);
    const candle = existing?.source === "live" ? existing : null;
    const high = Math.max(candle?.high ?? outcome.sell, outcome.sell);
    const low = Math.min(candle?.low ?? outcome.sell, outcome.sell);
    await prisma.rateDaily.upsert({
      where: { assetId_day: { assetId: asset.id, day: today } },
      update: {
        ...(candle ? {} : { open: existing?.open ?? prevCloseByAsset.get(asset.id) ?? outcome.sell }),
        high,
        low,
        close: outcome.sell,
        source: "live",
      },
      create: {
        assetId: asset.id,
        day: today,
        open: prevCloseByAsset.get(asset.id) ?? outcome.sell,
        high,
        low,
        close: outcome.sell,
        source: "live",
      },
    });

    // ---- تغییر روز نسبت به پایانی آخرین روز معاملاتی ----
    const prevClose = prevCloseByAsset.get(asset.id);
    const changePercent = prevClose
      ? round(((outcome.sell - prevClose) / prevClose) * 100, 2)
      : (asset.rate?.changePercent ?? 0);

    const data = {
      buy: outcome.buy,
      sell: outcome.sell,
      changePercent,
      dayLow: low,
      dayHigh: high,
      globalPrice: globalPriceOf(asset, outcome.sell, { usd, usdt }),
      confidence: round(outcome.confidence, 3),
      sourceCount: outcome.used,
      source: "تحلیل قیمت",
      fetchedAt: new Date(),
    };

    await prisma.rate.upsert({
      where: { assetId: asset.id },
      update: data,
      create: { assetId: asset.id, ...data },
    });

    results.push({ symbol: asset.symbol, ...outcome });
  }

  await learnQuality(errorsBySource, sourceByKey);

  log.info(`[engine] ${results.length} نرخ به‌روز شد`);
  return results;
}

/**
 * نقل‌قول‌های خام ← نقطه‌های وزن‌دار.
 * `staleFloor` برای دارایی‌ای که هنوز هیچ نرخی ندارد: نقل‌قول کهنه (ولی در
 * بازه‌ی maxAgeHours منبع) با وزن ناچیز پذیرفته می‌شود — بهتر از خالی ماندن.
 */
function toPoints(quotes, sourceByKey, staleFloor = 0) {
  return quotes
    .filter((quote) => quote.sell > 0)
    .map((quote) => {
      const source = sourceByKey.get(quote.sourceKey);
      const ttl = source?.ttlMs ?? QUOTE_TTL_MS;
      const weight =
        (source?.weight ?? 1) *
        Math.max(QUALITY_FLOOR, source?.quality ?? 1) *
        Math.max(staleFloor, freshness(quote.at, ttl));
      return {
        sell: quote.sell,
        buy: quote.buy ?? null,
        sourceKey: quote.sourceKey,
        weight,
        at: new Date(quote.at).getTime(),
        ttl,
      };
    })
    .filter((point) => point.weight > 0);
}

function independentCount(points) {
  return new Set(points.map((point) => point.sourceKey)).size;
}

/** اجماع روی نقطه‌های یک دارایی */
export function consensus(points) {
  if (!points.length) return null;

  const directPoints = points.filter((point) => !point.derived);

  // تک‌منبع: اجماعی در کار نیست، پس اطمینان متوسط می‌ماند
  if (points.length === 1) {
    const only = points[0];
    return {
      sell: priceRound(only.sell),
      buy: priceRound(only.buy ?? only.sell * 0.995),
      confidence: only.derived ? 0.3 : 0.45 * freshnessOfPoint(only),
      used: only.derived ? 0 : 1,
      rejected: 0,
    };
  }

  const med = weightedMedian(points.map((point) => ({ value: point.sell, weight: point.weight })));
  const deviations = points.map((point) => Math.abs(point.sell - med));
  const mad = median(deviations) || med * 0.001;

  const kept = points.filter((point) => Math.abs(point.sell - med) <= OUTLIER_FACTOR * mad * 1.4826);
  const pool = kept.length >= 2 ? kept : points;
  const rejected = points.length - pool.length;

  const sell = huberMean(pool, med, mad);

  const buyPool = pool.filter((point) => point.buy && point.buy <= point.sell * 1.02);
  const spread = buyPool.length
    ? median(buyPool.map((point) => (point.sell - point.buy) / point.sell))
    : 0.005;
  const buy = sell * (1 - Math.min(0.05, Math.max(0, spread)));

  // پراکندگی نسبی: هرچه منابع به هم نزدیک‌تر، اطمینان بالاتر
  const dispersion = (mad * 1.4826) / (med || 1);
  const agreement = Math.max(0, 1 - dispersion * 30);
  const independent = independentCount(pool.filter((point) => !point.derived));
  const coverage = Math.min(1, independent / 3 + (pool.some((p) => p.derived) ? 0.1 : 0));
  const fresh = pool.reduce((sum, p) => sum + freshnessOfPoint(p), 0) / pool.length;

  let confidence = (0.35 * coverage + 0.5 * agreement + 0.15 * fresh) * (independent ? 1 : 0.6);
  // تخمین کمکی جای منبع مستقل دوم را نمی‌گیرد
  if (independent <= 1) confidence = Math.min(confidence, 0.6);

  return {
    sell: priceRound(sell),
    buy: priceRound(buy),
    confidence: Math.min(1, Math.max(0, confidence)),
    used: independentCount(directPoints.filter((point) => pool.includes(point))),
    rejected,
  };
}

/**
 * میانگین هوبر با وزن منابع. نقاطی که از k برابر MAD دورترند، وزنشان
 * متناسب با فاصله کم می‌شود. سه تکرار برای همگرایی کافی است.
 */
function huberMean(points, start, mad) {
  const scale = mad * 1.4826 || start * 0.001;
  const k = 1.5;
  let center = start;
  for (let i = 0; i < 3; i += 1) {
    let num = 0;
    let den = 0;
    for (const point of points) {
      const r = Math.abs(point.sell - center) / scale;
      const w = point.weight * (r <= k ? 1 : k / r);
      num += point.sell * w;
      den += w;
    }
    if (!den) break;
    center = num / den;
  }
  return center;
}

/** کیفیت منابع را با میانگین نمایی خطایشان به‌روز می‌کند */
async function learnQuality(errorsBySource, sourceByKey) {
  for (const [key, errors] of errorsBySource) {
    const source = sourceByKey.get(key);
    if (!source || !errors.length) continue;
    const error = median(errors);
    // خطای ۱٪ ← امتیاز ۰٫۷۵، ۲٪ ← ۰٫۵، ۳٫۴٪ به بالا ← کف
    const score = Math.max(0.15, Math.min(1, 1 - error * 25));
    const quality = round(
      Math.max(QUALITY_FLOOR, (1 - QUALITY_RATE) * (source.quality ?? 1) + QUALITY_RATE * score),
      4,
    );
    if (Math.abs(quality - (source.quality ?? 1)) < 0.0005) continue;
    await prisma.source.update({ where: { key }, data: { quality } }).catch(() => {});
  }
}

/** قیمت جهانی: رمزارز بر حسب تتر، کالا و سهام بر حسب دلار */
function globalPriceOf(asset, sell, { usd, usdt }) {
  if (asset.category === "CRYPTO") {
    if (asset.symbol === "USDT") return 1;
    return usdt ? round(sell / usdt, 4) : null;
  }
  if (["COMMODITY", "STOCK", "INDEX"].includes(asset.category)) {
    return usd ? round(sell / usd, 2) : null;
  }
  return null;
}

/** ضریب تازگی: خطی از ۱ تا ۰ در بازه‌ی TTL منبع */
function freshness(at, ttl = QUOTE_TTL_MS) {
  const age = Date.now() - new Date(at).getTime();
  if (age <= 0) return 1;
  if (age >= ttl) return 0;
  return 1 - age / ttl;
}

function freshnessOfPoint(point) {
  return point.at ? freshness(point.at, point.ttl) : 1;
}

function weightedMedian(entries) {
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);
  let running = 0;
  for (const item of sorted) {
    running += item.weight;
    if (running >= total / 2) return item.value;
  }
  return sorted[sorted.length - 1].value;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function groupBy(items, keyOf) {
  const map = new Map();
  for (const item of items) {
    const key = keyOf(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** قیمت‌های کوچک (دونگ ویتنام، کیپ لائوس، …) اعشار لازم دارند */
function priceRound(value) {
  return Math.abs(value) >= 1000 ? Math.round(value) : Number(value.toPrecision(4));
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
