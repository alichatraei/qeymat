/**
 * محورهای نمودار: تیک‌های قیمت با گام یکسان و «گرد» (مثلاً هر ۲٬۰۰۰ تومان)
 * و تیک‌های زمانی روی مرز واقعی تقویم شمسی (روز، ماه، سال).
 *
 * این فایل خالص است و هم در مرورگر و هم روی سرور کار می‌کند.
 */

/** علامت راست‌به‌چپ: بدون آن «۲۸ شهریور» داخل SVG چپ‌به‌راست، «شهریور ۲۸» خوانده می‌شود */
const RLM = "‏";

export type Granularity = "raw" | "day" | "month" | "year";

/** عدد «خوش‌گرد» نزدیک: ۱، ۲، ۲٫۵، ۵ × ۱۰ⁿ */
function niceNumber(value: number, round: boolean) {
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let nice: number;
  if (round) nice = fraction < 1.5 ? 1 : fraction < 2.25 ? 2 : fraction < 3.5 ? 2.5 : fraction < 7.5 ? 5 : 10;
  else nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

/**
 * تیک‌های محور قیمت با فاصله‌ی برابر.
 * دامنه‌ی نمودار دقیقاً از اولین تا آخرین تیک است تا خطوط راهنما منظم باشند.
 */
export function niceScale(min: number, max: number, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [], domain: [0, 1] as [number, number] };
  if (min === max) {
    const pad = Math.abs(min) * 0.01 || 1;
    min -= pad;
    max += pad;
  }
  const step = niceNumber(niceNumber(max - min, false) / (count - 1), true);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = lo; value <= hi + step / 2; value += step) ticks.push(Number(value.toPrecision(12)));
  return { ticks, domain: [lo, hi] as [number, number], step };
}

/** اجزای تاریخ شمسی به وقت تهران؛ ترتیب را خودمان می‌چینیم چون ترتیب Intl بین موتورها فرق دارد */
const FA_PARTS = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function faParts(time: number) {
  const parts: Record<string, string> = {};
  for (const part of FA_PARTS.formatToParts(time)) parts[part.type] = part.value;
  return parts as { weekday: string; day: string; month: string; year: string; hour: string; minute: string };
}

const FORMAT = {
  time: (t: number) => {
    const p = faParts(t);
    return `${p.hour}:${p.minute}`;
  },
  day: (t: number) => {
    const p = faParts(t);
    return `${p.day} ${p.month}`;
  },
  monthShort: (t: number) => {
    const p = faParts(t);
    return `${p.month} ${p.year.slice(-2)}`;
  },
  month: (t: number) => {
    const p = faParts(t);
    return `${p.month} ${p.year}`;
  },
  year: (t: number) => faParts(t).year,
  full: (t: number) => {
    const p = faParts(t);
    return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
  },
  fullTime: (t: number) => {
    const p = faParts(t);
    return `${p.day} ${p.month} · ${p.hour}:${p.minute}`;
  },
};

/** کلید مرز تقویمی به وقت تهران */
const PARTS = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  hourCycle: "h23",
});

function calendarKey(time: number, unit: "hour3" | "day" | "month" | "year") {
  const parts = Object.fromEntries(PARTS.formatToParts(time).map((part) => [part.type, part.value]));
  if (unit === "year") return parts.year;
  if (unit === "month") return `${parts.year}-${parts.month}`;
  if (unit === "day") return `${parts.year}-${parts.month}-${parts.day}`;
  return `${parts.year}-${parts.month}-${parts.day}-${Math.floor(Number(parts.hour) / 3)}`;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * تیک‌های زمانی: فقط روی نقطه‌هایی که مرز تقویمی‌اند (آغاز روز، ماه یا سال شمسی)
 * و با گام یکسان بین آن مرزها، حداکثر `max` تیک.
 */
export function timeTicks(times: number[], max = 7) {
  if (times.length < 2) return { ticks: times, format: (t: number) => label(t, "day") };

  const span = times[times.length - 1] - times[0];
  const unit = span <= 1.6 * DAY ? "hour3" : span <= 120 * DAY ? "day" : span <= 2.5 * 365 * DAY ? "month" : "year";

  const boundaries: number[] = [];
  let previous = "";
  for (const time of times) {
    const key = calendarKey(time, unit);
    if (key !== previous) boundaries.push(time);
    previous = key;
  }

  const step = Math.max(1, Math.ceil(boundaries.length / max));
  // از آخر به اول انتخاب می‌شود تا تازه‌ترین روز حتماً برچسب داشته باشد
  const ticks: number[] = [];
  for (let i = boundaries.length - 1; i >= 0; i -= step) ticks.unshift(boundaries[i]);

  const kind: Granularity | "monthShort" =
    unit === "hour3" ? "raw" : unit === "day" ? "day" : unit === "month" ? "monthShort" : "year";
  return { ticks, format: (t: number) => label(t, kind) };
}

/** برچسب کوتاه محور */
export function label(time: number, kind: Granularity | "monthShort") {
  const text =
    kind === "raw"
      ? FORMAT.time(time)
      : kind === "day"
        ? FORMAT.day(time)
        : kind === "monthShort"
          ? FORMAT.monthShort(time)
          : kind === "month"
            ? FORMAT.month(time)
            : FORMAT.year(time);
  return RLM + text;
}

/** برچسب کامل راهنمای نمودار بر اساس دانه‌بندی سری */
export function tooltipLabel(time: number, granularity: Granularity) {
  if (granularity === "raw") return FORMAT.fullTime(time);
  if (granularity === "month") return FORMAT.month(time);
  if (granularity === "year") return FORMAT.year(time);
  return FORMAT.full(time);
}
