import "server-only";
import { prisma } from "@qeymat/db";
import { cacheGet, cacheSet } from "./redis";

/**
 * تحلیل قیمت — مخصوص مشترکان قیمت پلاس.
 *
 * همه‌چیز از کندل‌های روزانه‌ی خودمان (RateDaily) و نرخ زنده‌ی موتور اجماع
 * محاسبه می‌شود؛ هیچ داده‌ی تحلیلی از بیرون گرفته نمی‌شود.
 *
 * خروجی توصیفی است، نه توصیه‌ی معامله.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type Outlook = "bullish" | "bearish" | "neutral";

export type Analysis = {
  symbol: string;
  nameFa: string;
  unit: string;
  price: number;
  updatedAt: string;
  confidence: number | null;
  sourceCount: number | null;
  sources: { key: string; title: string; price: number; at: string; deviation: number }[];
  changes: { id: string; label: string; percent: number | null }[];
  indicators: {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    rsi14: number | null;
    macd: number | null;
    macdSignal: number | null;
    volatility30: number | null;
    high52w: number | null;
    low52w: number | null;
    position52w: number | null;
    drawdown1y: number | null;
    support: number | null;
    resistance: number | null;
  };
  special: { label: string; value: string; hint: string }[];
  outlook: Outlook;
  score: number;
  summary: string;
  insights: string[];
};

/** وزن طلای خالص هر سکه بر حسب «گرم طلای ۱۸ عیار» معادل */
const COIN_GOLD18_GRAMS: Record<string, number> = {
  // سکه‌ی تمام: ۸٫۱۳۳ گرم با عیار ۹۰۰ ← ۸٫۱۳۳ × ۰٫۹ / ۰٫۷۵
  EMAMI: 9.7596,
  BAHAR: 9.7596,
  HALF: 4.8798,
  QUARTER: 2.4399,
  GRAMI: 1.2,
};

const CHANGE_WINDOWS = [
  { id: "1w", label: "یک هفته", days: 7 },
  { id: "1m", label: "یک ماه", days: 30 },
  { id: "3m", label: "سه ماه", days: 91 },
  { id: "1y", label: "یک سال", days: 365 },
  { id: "3y", label: "سه سال", days: 3 * 365 },
  { id: "5y", label: "پنج سال", days: 5 * 365 },
  { id: "10y", label: "ده سال", days: 10 * 365 },
];

export async function analyze(symbol: string): Promise<Analysis | null> {
  const upper = symbol.toUpperCase();
  const cacheKey = `qeymat:analysis:${upper}`;
  const cached = await cacheGet<Analysis>(cacheKey);
  if (cached) return cached;

  const asset = await prisma.asset.findUnique({ where: { symbol: upper }, include: { rate: true } });
  if (!asset?.rate) return null;

  const since = new Date(Date.now() - 400 * DAY_MS);
  const [daily, quotes, sources] = await Promise.all([
    prisma.rateDaily.findMany({
      where: { assetId: asset.id, day: { gte: since } },
      orderBy: { day: "asc" },
      select: { day: true, close: true, high: true, low: true },
    }),
    prisma.sourceQuote.findMany({
      where: { assetId: asset.id, at: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      orderBy: { at: "desc" },
    }),
    prisma.source.findMany({ select: { key: true, title: true } }),
  ]);

  const price = asset.rate.sell;
  const closes = daily.map((row) => row.close);
  // آخرین کندل ممکن است همان امروز باشد؛ قیمت زنده جایگزینش می‌شود
  if (closes.length && sameDay(daily[daily.length - 1].day, new Date())) closes[closes.length - 1] = price;
  else closes.push(price);

  // ---- تغییرات بازه‌ای (تا ۱۰ سال، از کندل نزدیک‌ترین روز) ----
  const changes = await Promise.all(
    CHANGE_WINDOWS.map(async (window) => {
      const target = new Date(Date.now() - window.days * DAY_MS);
      const past = await prisma.rateDaily.findFirst({
        where: { assetId: asset.id, day: { lte: target, gte: new Date(target.getTime() - 10 * DAY_MS) } },
        orderBy: { day: "desc" },
        select: { close: true },
      });
      return {
        id: window.id,
        label: window.label,
        percent: past?.close ? round(((price - past.close) / past.close) * 100, 2) : null,
      };
    }),
  );

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsi14 = rsi(closes, 14);
  const { macd, signal: macdSignal } = macdOf(closes);
  const volatility30 = volatility(closes, 30);

  const lastYear = daily.filter((row) => row.day.getTime() >= Date.now() - 365 * DAY_MS);
  const high52w = lastYear.length ? Math.max(price, ...lastYear.map((row) => row.high)) : null;
  const low52w = lastYear.length ? Math.min(price, ...lastYear.map((row) => row.low)) : null;
  const position52w =
    high52w && low52w && high52w > low52w ? round(((price - low52w) / (high52w - low52w)) * 100, 1) : null;
  const drawdown1y = high52w ? round(((price - high52w) / high52w) * 100, 2) : null;

  const { support, resistance } = levels(daily.slice(-120), price);

  // ---- شاخص‌های ویژه‌ی بازار ایران ----
  const special: Analysis["special"] = [];
  const rateOf = async (s: string) =>
    (await prisma.asset.findUnique({ where: { symbol: s }, include: { rate: true } }))?.rate?.sell ?? null;

  if (COIN_GOLD18_GRAMS[upper]) {
    const gold18 = await rateOf("GOLD18");
    if (gold18) {
      const intrinsic = gold18 * COIN_GOLD18_GRAMS[upper];
      const bubble = ((price - intrinsic) / intrinsic) * 100;
      special.push({
        label: "حباب سکه",
        value: `${fmtPercent(bubble)}`,
        hint: `ارزش ذاتی طلای سکه حدود ${fmt(intrinsic)} تومان است.`,
      });
    }
  }
  if (upper === "USD" || upper === "USDT") {
    const [usd, usdt] = await Promise.all([rateOf("USD"), rateOf("USDT")]);
    if (usd && usdt) {
      const gap = ((usdt - usd) / usd) * 100;
      special.push({
        label: "فاصله‌ی تتر و دلار",
        value: fmtPercent(gap),
        hint: gap > 0 ? "تتر گران‌تر از دلار نقدی معامله می‌شود." : "تتر ارزان‌تر از دلار نقدی معامله می‌شود.",
      });
    }
  }
  if (upper === "USD_FARDA" || upper === "USD_HERAT") {
    const usd = await rateOf("USD");
    if (usd) {
      special.push({
        label: "فاصله با دلار نقدی تهران",
        value: fmtPercent(((price - usd) / usd) * 100),
        hint: "مثبت یعنی بازار انتظار افزایش نرخ دارد.",
      });
    }
  }
  if (upper === "ABSHODEH" || upper === "GOLD18") {
    const [abshodeh, gold18] = await Promise.all([rateOf("ABSHODEH"), rateOf("GOLD18")]);
    if (abshodeh && gold18) {
      const implied = abshodeh / 4.3318;
      special.push({
        label: "گرم طلای مستتر در آبشده",
        value: `${fmt(implied)} تومان`,
        hint: `${fmtPercent(((gold18 - implied) / implied) * 100)} نسبت به نرخ گرم طلای ۱۸`,
      });
    }
  }

  // ---- جمع‌بندی ----
  let score = 0;
  const insights: string[] = [];
  if (sma50) {
    const above = price > sma50;
    score += above ? 20 : -20;
    insights.push(
      `قیمت ${above ? "بالای" : "زیر"} میانگین ۵۰ روزه (${fmt(sma50)}) است${above ? "؛ روند میان‌مدت رو به بالاست." : "؛ روند میان‌مدت ضعیف است."}`,
    );
  }
  if (sma200) {
    const above = price > sma200;
    score += above ? 20 : -20;
    insights.push(`قیمت ${above ? "بالای" : "زیر"} میانگین ۲۰۰ روزه است — ${above ? "روند بلندمدت صعودی" : "روند بلندمدت نزولی"}.`);
  }
  if (sma50 && sma200) {
    if (sma50 > sma200) score += 10;
    else score -= 10;
  }
  if (rsi14 !== null) {
    if (rsi14 >= 70) {
      score -= 10;
      insights.push(`RSI برابر ${fmt(rsi14)} است؛ بازار در محدوده‌ی اشباع خرید است و احتمال اصلاح بیشتر می‌شود.`);
    } else if (rsi14 <= 30) {
      score += 10;
      insights.push(`RSI برابر ${fmt(rsi14)} است؛ بازار در محدوده‌ی اشباع فروش است.`);
    } else {
      score += rsi14 > 50 ? 5 : -5;
      insights.push(`RSI برابر ${fmt(rsi14)} است و مومنتوم ${rsi14 > 50 ? "کمی مثبت" : "کمی منفی"} است.`);
    }
  }
  if (macd !== null && macdSignal !== null) {
    score += macd > macdSignal ? 10 : -10;
    insights.push(`MACD ${macd > macdSignal ? "بالای" : "زیر"} خط سیگنال است.`);
  }
  if (volatility30 !== null) {
    insights.push(`نوسان سالانه‌شده‌ی ۳۰ روز اخیر حدود ${fmt(volatility30)}٪ است.`);
  }
  if (support && resistance) {
    insights.push(`نزدیک‌ترین حمایت ${fmt(support)} و نزدیک‌ترین مقاومت ${fmt(resistance)} است.`);
  }

  score = Math.max(-100, Math.min(100, score));
  const outlook: Outlook = score >= 25 ? "bullish" : score <= -25 ? "bearish" : "neutral";
  const summary =
    outlook === "bullish"
      ? "برآیند شاخص‌ها صعودی است."
      : outlook === "bearish"
        ? "برآیند شاخص‌ها نزولی است."
        : "بازار در حالت خنثی و بدون روند مشخص است.";

  const titleByKey = new Map(sources.map((source) => [source.key, source.title]));
  const analysis: Analysis = {
    symbol: asset.symbol,
    nameFa: asset.nameFa,
    unit: asset.unit,
    price,
    updatedAt: asset.rate.fetchedAt.toISOString(),
    confidence: asset.rate.confidence ?? null,
    sourceCount: asset.rate.sourceCount ?? null,
    sources: quotes.map((quote) => ({
      key: quote.sourceKey,
      title: titleByKey.get(quote.sourceKey) ?? quote.sourceKey,
      price: quote.sell,
      at: quote.at.toISOString(),
      deviation: round(((quote.sell - price) / price) * 100, 2),
    })),
    changes,
    indicators: {
      sma20,
      sma50,
      sma200,
      rsi14,
      macd,
      macdSignal,
      volatility30,
      high52w,
      low52w,
      position52w,
      drawdown1y,
      support,
      resistance,
    },
    special,
    outlook,
    score,
    summary,
    insights,
  };

  await cacheSet(cacheKey, analysis, 120);
  return analysis;
}

/* ------------------------------ شاخص‌ها ------------------------------ */

function sma(values: number[], period: number) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return round(slice.reduce((sum, value) => sum + value, 0) / period, 2);
}

function emaSeries(values: number[], period: number) {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((value, index) => {
    out.push(index === 0 ? value : value * k + out[index - 1] * (1 - k));
  });
  return out;
}

function macdOf(values: number[]) {
  if (values.length < 35) return { macd: null, signal: null };
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  const line = fast.map((value, index) => value - slow[index]);
  const signal = emaSeries(line.slice(26), 9);
  return { macd: round(line[line.length - 1], 2), signal: round(signal[signal.length - 1], 2) };
}

/** RSI با هموارسازی وایلدر */
function rsi(values: number[], period: number) {
  if (values.length <= period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(0, diff)) / period;
    loss = (loss * (period - 1) + Math.max(0, -diff)) / period;
  }
  if (!loss) return 100;
  return round(100 - 100 / (1 + gain / loss), 1);
}

/** انحراف معیار بازده لگاریتمی روزانه، سالانه‌شده (درصد) */
function volatility(values: number[], period: number) {
  if (values.length <= period) return null;
  const slice = values.slice(-period - 1);
  const returns = slice.slice(1).map((value, index) => Math.log(value / slice[index]));
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return round(Math.sqrt(variance) * Math.sqrt(365) * 100, 1);
}

/**
 * حمایت و مقاومت از کف‌ها و سقف‌های محلی (پنجره‌ی ۳ روزه).
 * نزدیک‌ترین کف زیر قیمت و نزدیک‌ترین سقف بالای قیمت.
 */
function levels(rows: { low: number; high: number }[], price: number) {
  const lows: number[] = [];
  const highs: number[] = [];
  for (let i = 3; i < rows.length - 3; i += 1) {
    const window = rows.slice(i - 3, i + 4);
    if (rows[i].low === Math.min(...window.map((row) => row.low))) lows.push(rows[i].low);
    if (rows[i].high === Math.max(...window.map((row) => row.high))) highs.push(rows[i].high);
  }
  const below = lows.filter((value) => value < price * 0.998);
  const above = highs.filter((value) => value > price * 1.002);
  return {
    support: below.length ? Math.max(...below) : rows.length ? Math.min(...rows.map((row) => row.low)) : null,
    resistance: above.length ? Math.min(...above) : rows.length ? Math.max(...rows.map((row) => row.high)) : null,
  };
}

/** کندل روزانه (نیمه‌شب UTC به نمایندگی از روز تهران) مال امروز تهران است؟ */
function sameDay(day: Date, now: Date) {
  const tehran = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(now);
  return day.toISOString().slice(0, 10) === tehran;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function fmt(value: number) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: value < 100 ? 1 : 0 }).format(value);
}

function fmtPercent(value: number) {
  return `${value >= 0 ? "+" : "−"}٪${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(Math.abs(value))}`;
}
