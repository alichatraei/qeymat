/** فرمت‌های صفحهٔ تبدیل (فاز شیشه‌ای) — گرد کردن اسپک و عدد به حروف فارسی */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faDigits = (value: string) => value.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
const groupThousands = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");

/** گرد کردن اسپک: بالای ۱۰۰ بدون اعشار؛ ۱ تا ۱۰۰ دو رقم؛ زیر ۱ چهار رقم */
export function convertAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const decimals = value < 1 ? 4 : value < 100 ? 2 : 0;
  const [whole, fraction] = value.toFixed(decimals).split(".");
  let out = groupThousands(whole);
  if (fraction && /[1-9]/.test(fraction)) out += `٫${fraction.replace(/0+$/, "")}`;
  return faDigits(out);
}

/** ورودی کاربر (ارقام فارسی/عربی/لاتین، ممیز «٫» یا «.») به رشتهٔ عددی لاتین */
export function toLatinDigits(value: string): string {
  let out = value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٫,]/g, ".")
    .replace(/[^0-9.]/g, "");
  const dot = out.indexOf(".");
  if (dot >= 0) out = out.slice(0, dot + 1) + out.slice(dot + 1).replace(/\./g, "");
  return out.slice(0, 15);
}

/** نمایش رشتهٔ مبلغ در حال تایپ با جداکننده و ارقام فارسی */
export function amountDisplay(raw: string): string {
  if (!raw) return "۰";
  const [whole, fraction] = raw.split(".");
  return faDigits(groupThousands(whole || "0")) + (fraction !== undefined ? `٫${faDigits(fraction)}` : "");
}

const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const SCALES = ["", "هزار", "میلیون", "میلیارد", "هزار میلیارد"];

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (r >= 10 && r < 20) parts.push(TEENS[r - 10]);
  else {
    const t = Math.floor(r / 10);
    const u = r % 10;
    if (t) parts.push(TENS[t]);
    if (u) parts.push(ONES[u]);
  }
  return parts.join(" و ");
}

/** مبلغ به حروف فارسی — برای کاربری که با عددهای بلند راحت نیست */
export function amountInWords(value: number): string {
  let v = Math.floor(value);
  if (v <= 0 || v >= 1e15) return "";
  const parts: string[] = [];
  let scale = 0;
  while (v > 0) {
    const group = v % 1000;
    if (group) parts.unshift(threeDigits(group) + (SCALES[scale] ? ` ${SCALES[scale]}` : ""));
    v = Math.floor(v / 1000);
    scale += 1;
  }
  return parts.join(" و ");
}
