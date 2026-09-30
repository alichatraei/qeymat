import { fa, unitLabel } from "@qeymat/shared";
import type { RateView } from "@/lib/types";

/** نام و واحد دارایی‌های مجازی تبدیل */
const VIRTUAL: Record<string, string> = { IRT: "تومان", IRR: "ریال" };

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online";
export const BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");

/** ارزش یک واحد به تومان؛ دارایی دلاری (نفت، فلزات) با نرخ دلار */
export function tomanOf(symbol: string, bySymbol: Map<string, RateView>) {
  if (symbol === "IRT") return 1;
  if (symbol === "IRR") return 0.1;
  const rate = bySymbol.get(symbol);
  if (!rate) return 0;
  if (rate.unit === "USD") return rate.sell * (bySymbol.get("USD")?.sell ?? 0);
  return rate.sell;
}

export function nameOf(symbol: string, bySymbol: Map<string, RateView>) {
  return VIRTUAL[symbol] ?? bySymbol.get(symbol)?.nameFa ?? symbol;
}

/** عدد بزرگ بدون اعشار؛ کوچک (مثل تومان به بیت‌کوین) با رقم‌های معنادار */
export function amountText(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "۰";
  if (value >= 100) return fa(Math.round(value));
  return new Intl.NumberFormat("fa-IR", { maximumSignificantDigits: 6 }).format(value);
}

export function priceText(rate: RateView) {
  return rate.unit === "USD"
    ? new Intl.NumberFormat("fa-IR", { maximumFractionDigits: rate.sell < 100 ? 2 : 0 }).format(rate.sell)
    : fa(Math.round(rate.sell));
}

/** «۱۴۰۵/۰۷/۰۸ | ۱۵:۱۰» به وقت تهران */
export function stampText(date = new Date()) {
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tehran",
  }).formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return `${parts.year}/${parts.month}/${parts.day} | ${parts.hour}:${parts.minute}`;
}

export function changeText(percent: number) {
  if (!percent) return "بدون تغییر";
  const value = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(Math.abs(percent));
  return `${percent > 0 ? "▲ +" : "▼ −"}٪${value} امروز`;
}

/** پرچم ایموجی از کد کشور (US ← 🇺🇸) */
export function flagEmoji(countryCode?: string | null) {
  if (!countryCode || countryCode.length !== 2) return "";
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function footer() {
  return BOT_USERNAME ? `\n\n🔗 qeymat.online | @${BOT_USERNAME}` : "\n\n🔗 qeymat.online";
}

/** کپشن قیمت یک دارایی — مثل نمونه‌ی رقیب، با برند «قیمت» */
export function priceCaption(rate: RateView, bySymbol: Map<string, RateView>) {
  const usd = bySymbol.get("USD")?.sell ?? 0;
  const lines = [`✨ ۱ ${rate.nameFa}`, ""];
  if (rate.unit === "USD") {
    lines.push(`💵 ${priceText(rate)} دلار`);
    if (usd) lines.push(`💸 ${fa(Math.round(rate.sell * usd))} تومان`);
  } else {
    lines.push(`💸 ${priceText(rate)} ${unitLabel(rate.unit)}`);
    if (usd && rate.symbol !== "USD") lines.push(`💵 ${amountText(rate.sell / usd)} دلار`);
  }
  lines.push(`${rate.changePercent >= 0 ? "📈" : "📉"} ${changeText(rate.changePercent)}`);
  lines.push("", `🕒 ${stampText()}`);
  return lines.join("\n") + footer();
}

export type Conversion = {
  amount: number;
  from: string;
  to: string;
  result: number;
  fromName: string;
  toName: string;
  /** «هر دلار آمریکا = ۲۵۵٬۶۷۱ تومان» */
  rateLine: string;
};

export function convert(amount: number, from: string, to: string, bySymbol: Map<string, RateView>): Conversion | null {
  const fromToman = tomanOf(from, bySymbol);
  const toToman = tomanOf(to, bySymbol);
  if (!fromToman || !toToman) return null;
  const fromName = nameOf(from, bySymbol);
  const toName = nameOf(to, bySymbol);
  const unit = from === "IRT" || from === "IRR" ? to : from;
  const unitToman = tomanOf(unit, bySymbol);
  const rateLine =
    to === "IRT" || from === "IRT"
      ? `هر ${nameOf(unit, bySymbol)} = ${fa(Math.round(unitToman))} تومان`
      : `هر ${fromName} = ${amountText(fromToman / toToman)} ${toName}`;
  return { amount, from, to, result: (amount * fromToman) / toToman, fromName, toName, rateLine };
}

export function conversionCaption(conversion: Conversion) {
  return (
    [
      `💱 ${amountText(conversion.amount)} ${conversion.fromName} =`,
      "",
      `💸 ${amountText(conversion.result)} ${conversion.toName}`,
      `📊 ${conversion.rateLine}`,
      "",
      `🕒 ${stampText()}`,
    ].join("\n") + footer()
  );
}

const CATEGORY_TITLE: Record<string, string> = {
  CURRENCY: "💵 نرخ ارز",
  GOLD: "🟡 طلا و سکه",
  CRYPTO: "🪙 رمزارز",
  COMMODITY: "🛢 کالا و فلزات",
};

/** فهرست متنی یک دسته، مثل جدول سایت */
export function categoryList(category: string, assets: RateView[]) {
  const rows = assets
    .filter((asset) => asset.category === category && asset.featured !== false)
    .slice(0, 25)
    .map((asset) => {
      const flag = flagEmoji(asset.countryCode) || "•";
      const dot = asset.changePercent > 0 ? "🟢" : asset.changePercent < 0 ? "🔴" : "⚪️";
      return `${flag} ${asset.nameFa}: ${priceText(asset)} ${unitLabel(asset.unit)} ${dot}`;
    });
  if (!rows.length) return null;
  return [`${CATEGORY_TITLE[category] ?? category} — ${stampText()}`, "", ...rows].join("\n") + footer();
}

export const HELP = [
  "سلام! من ربات «قیمت» هستم 👋",
  "",
  "نام هر ارز یا دارایی را بفرستید تا قیمت لحظه‌ای‌اش را ببینید:",
  "دلار · یورو · طلا · سکه · تتر · بیت‌کوین · نفت",
  "",
  "برای تبدیل، مبلغ و دو ارز را بنویسید:",
  "۱۰ دلار تومان · ده یورو به دلار · 10 usd toman · ۲ میلیون تومان دلار",
  "",
  "برای فرستادن قیمت در هر گفت‌وگو، در همان‌جا بنویسید:",
  BOT_USERNAME ? `@${BOT_USERNAME} ۱۰ دلار` : "نام ربات و بعد مبلغ و ارز",
].join("\n");
