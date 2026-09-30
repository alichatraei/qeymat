/**
 * فهم پیام کاربر ربات: «دلار»، «۱۰ دلار تومان»، «ده یورو به دلار»،
 * «10 usd toman»، «۲ میلیون تومان دلار»، «btc».
 *
 * خروجی یکی از این‌هاست:
 *   { kind: "price", symbol }                      ← قیمت لحظه‌ای یک دارایی
 *   { kind: "convert", amount, from, to }          ← تبدیل (to پیش‌فرض تومان)
 *   null                                           ← چیزی فهمیده نشد
 *
 * «IRT» یعنی تومان و «IRR» ریال؛ هر دو دارایی مجازی‌اند و در فهرست نرخ‌ها نیستند.
 */
export type Parsed =
  | { kind: "price"; symbol: string }
  | { kind: "convert"; amount: number; from: string; to: string };

export type AliasAsset = { symbol: string; nameFa: string; nameEn?: string | null };

/** نام‌های رایج که در نام رسمی دارایی نیستند؛ بلندترین تطبیق برنده است */
const EXTRA: Record<string, string[]> = {
  IRT: ["تومان", "تومن", "تومانی", "toman", "tomans", "irt"],
  IRR: ["ریال", "rial", "irr"],
  USD: ["دلار", "دلار امریکا", "دلار امریکایی", "دلار تهران", "دلار ازاد", "dollar", "dollars", "usd", "$"],
  EUR: ["یورو", "euro", "eur", "€"],
  GBP: ["پوند", "پوند انگلیس", "gbp", "pound"],
  AED: ["درهم", "درهم امارات", "درهم دبی", "aed", "dirham"],
  TRY: ["لیر", "لیر ترکیه", "try", "lira"],
  CNY: ["یوان", "یوان چین", "cny", "yuan"],
  CAD: ["دلار کانادا", "cad"],
  RUB: ["روبل", "rub"],
  IQD: ["دینار عراق", "iqd"],
  USDT: ["تتر", "usdt", "tether"],
  BTC: ["بیت کوین", "بیتکوین", "بیت", "btc", "bitcoin"],
  ETH: ["اتریوم", "اتر", "eth", "ethereum"],
  SOL: ["سولانا", "sol", "solana"],
  TON: ["تون", "تون کوین", "ton", "toncoin"],
  DOGE: ["دوج", "دوج کوین", "doge"],
  XRP: ["ریپل", "xrp"],
  GOLD18: ["طلا", "طلای 18", "طلا 18", "طلای 18 عیار", "گرم طلا", "گرم طلای 18", "gold"],
  GOLD24: ["طلای 24", "طلا 24", "طلای 24 عیار"],
  EMAMI: ["سکه", "سکه امامی", "امامی", "سکه تمام", "تمام سکه", "coin"],
  BAHAR: ["سکه بهار", "بهار ازادی", "سکه بهار ازادی"],
  HALF: ["نیم سکه", "نیم"],
  QUARTER: ["ربع سکه", "ربع"],
  GRAMI: ["سکه گرمی", "گرمی"],
  ABSHODEH: ["ابشده", "طلای ابشده", "مثقال", "مثقال طلا", "ابشده نقدی"],
  OUNCE: ["انس", "انس طلا", "اونس", "انس جهانی", "ounce"],
  BRENT: ["نفت", "نفت برنت", "برنت", "oil", "brent"],
  OPEC: ["اوپک", "نفت اوپک", "opec"],
  SILVER999: ["نقره", "گرم نقره", "نقره 999"],
  XAG: ["انس نقره", "silver"],
};

const DIGITS: Record<string, number> = {
  صفر: 0, یک: 1, یه: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, شیش: 6, هفت: 7, هشت: 8, نه: 9,
  ده: 10, یازده: 11, دوازده: 12, سیزده: 13, چهارده: 14, پانزده: 15, پونزده: 15, شانزده: 16, شونزده: 16,
  هفده: 17, هجده: 18, هیجده: 18, نوزده: 19, بیست: 20, سی: 30, چهل: 40, پنجاه: 50, شصت: 60,
  هفتاد: 70, هشتاد: 80, نود: 90, صد: 100, یکصد: 100, دویست: 200, سیصد: 300, چهارصد: 400,
  پانصد: 500, پونصد: 500, ششصد: 600, هفتصد: 700, هشتصد: 800, نهصد: 900,
};
const SCALES: Record<string, number> = {
  هزار: 1e3, k: 1e3, میلیون: 1e6, ملیون: 1e6, m: 1e6, میلیارد: 1e9, ملیارد: 1e9, b: 1e9, همت: 1e12, تریلیون: 1e12,
};

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[آأإ]/g, "ا")
    .replace(/ۀ/g, "ه")
    .replace(/[ًٌٍَُِّْٔ]/g, "")
    .replace(/‌|‏|‎/g, " ")
    // جداکننده‌ی هزارگان داخل عدد: «10,000» و «۱۰٬۰۰۰»
    .replace(/(\d)[,٬،](?=\d{3}\b)/g, "$1")
    .replace(/٫/g, ".")
    // «10usd» ← «10 usd» و «$10» ← «$ 10»
    .replace(/([$€])/g, " $1 ")
    .replace(/(\d)([^\d\s.])/g, "$1 $2")
    .replace(/([^\d\s.])(\d)/g, "$1 $2")
    .replace(/[؟?!،,:;()«»"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type AliasIndex = { byLength: string[][]; symbolOf: Map<string, string> };

export function buildAliases(assets: AliasAsset[]): AliasIndex {
  const symbolOf = new Map<string, string>();
  const add = (alias: string, symbol: string) => {
    const key = normalize(alias);
    // نام دستی (EXTRA) بر نام خودکار مقدم است؛ اولین ثبت می‌ماند
    if (key && !symbolOf.has(key)) symbolOf.set(key, symbol);
  };
  for (const [symbol, list] of Object.entries(EXTRA)) list.forEach((alias) => add(alias, symbol));
  for (const asset of assets) {
    add(asset.symbol, asset.symbol);
    add(asset.nameFa, asset.symbol);
    if (asset.nameEn) add(asset.nameEn, asset.symbol);
  }
  // نام‌های چندکلمه‌ای، از بلند به کوتاه
  const byLength = [...symbolOf.keys()].map((key) => key.split(" ")).sort((a, b) => b.length - a.length);
  return { byLength, symbolOf };
}

/** عدد رقمی یا حروفی از ابتدای tokens[i]؛ { value, next } یا null */
function readNumber(tokens: string[], start: number): { value: number; next: number } | null {
  let i = start;
  let total = 0;
  let group = 0;
  let seen = false;

  while (i < tokens.length) {
    const token = tokens[i];
    if (/^\d+(\.\d+)?$/.test(token)) {
      group += Number(token);
      seen = true;
    } else if (token in DIGITS) {
      group += DIGITS[token];
      seen = true;
    } else if (token === "نیم" && seen) {
      group += 0.5;
    } else if (token in SCALES && seen) {
      total += (group || 1) * SCALES[token];
      group = 0;
    } else if (token === "و" && seen && i + 1 < tokens.length && (tokens[i + 1] in DIGITS || tokens[i + 1] === "نیم" || /^\d/.test(tokens[i + 1]))) {
      // «صد و بیست»، «یک و نیم»
    } else {
      break;
    }
    i += 1;
  }
  return seen ? { value: total + group, next: i } : null;
}

export function parseMessage(text: string, index: AliasIndex): Parsed | null {
  const tokens = normalize(text).split(" ").filter(Boolean);
  let amount: number | null = null;
  const symbols: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    // «نیم سکه» پیش از عدد «نیم» بررسی می‌شود
    const alias = matchAlias(tokens, i, index);
    if (alias && !(amount === null && /^\d/.test(tokens[i]))) {
      symbols.push(alias.symbol);
      i = alias.next;
      continue;
    }
    const number: { value: number; next: number } | null = amount === null ? readNumber(tokens, i) : null;
    if (number) {
      amount = number.value;
      i = number.next;
      continue;
    }
    // واژه‌ی پرکننده یا ناشناخته نادیده گرفته می‌شود
    i += 1;
  }

  if (!symbols.length) return null;
  const [first, second] = symbols;

  if (amount === null || amount <= 0) {
    // «دلار تومان» یعنی همان قیمت دلار
    const symbol = first === "IRT" || first === "IRR" ? second : first;
    return symbol && symbol !== "IRT" && symbol !== "IRR" ? { kind: "price", symbol } : null;
  }

  if (second && second !== first) return { kind: "convert", amount, from: first, to: second };
  // «۱۰۰ هزار تومان» به‌تنهایی: معادل دلاری
  if (first === "IRT" || first === "IRR") return { kind: "convert", amount, from: first, to: "USD" };
  return { kind: "convert", amount, from: first, to: "IRT" };
}

function matchAlias(tokens: string[], start: number, index: AliasIndex) {
  for (const words of index.byLength) {
    if (start + words.length > tokens.length) continue;
    let ok = true;
    for (let k = 0; k < words.length; k += 1) {
      if (tokens[start + k] !== words[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return { symbol: index.symbolOf.get(words.join(" "))!, next: start + words.length };
  }
  return null;
}
