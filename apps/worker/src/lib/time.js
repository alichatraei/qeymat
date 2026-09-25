/** تاریخ‌های روزانه به وقت تهران — کلید جدول RateDaily. */

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** روز تقویمی تهرانِ یک لحظه، به شکل Date در نیمه‌شب UTC (مناسب ستون DATE) */
export function tehranDay(at = new Date()) {
  return new Date(`${dayFormatter.format(at)}T00:00:00.000Z`);
}

/** «2026/09/24» یا «2026-09-24» ← Date نیمه‌شب UTC */
export function parseGregorianDay(text) {
  const match = /^(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})$/.exec(String(text).trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * تبدیل تاریخ شمسی به میلادی (الگوریتم رسمی تقویم جلالی).
 * «1403/05/12» ← Date نیمه‌شب UTC
 */
export function parseJalaliDay(text) {
  const match = /^(1[2-4]\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})$/.exec(String(text).trim());
  if (!match) return null;
  const [, jy, jm, jd] = match.map(Number);
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd));
}

export function parseAnyDay(text) {
  return parseJalaliDay(text) || parseGregorianDay(text);
}

function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const monthDays = [
    0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > monthDays[gm]; gm += 1) gd -= monthDays[gm];
  return [gy, gm, gd];
}
