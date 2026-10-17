import RateIcon from "./RateIcon";
import type { RateView } from "@/lib/types";

/**
 * آیکن‌های اختصاصی «قیمت» (نسخهٔ B دیزاین فاز ۲): قاب مربع گرد سبز تیره با
 * حلقهٔ Q کرم و نقطهٔ نعنایی. فایل‌ها در public/icons/assets هستند و این‌جا
 * فقط نماد سایت به شناسهٔ آیکن نگاشت می‌شود. دارایی بدون آیکن اختصاصی به
 * RateIcon قدیمی (پرچم/آواتار) برمی‌گردد.
 */
const ICON_IDS: Record<string, string> = {
  USD: "usd",
  USD_FARDA: "usd",
  USD_HERAT: "usd",
  EUR: "eur",
  AED: "aed",
  GBP: "gbp",
  TRY: "try",
  CAD: "cad",
  CNY: "cny",
  CHF: "chf",
  JPY: "jpy",
  RUB: "rub",
  INR: "inr",
  SAR: "sar",
  KWD: "kwd",
  IQD: "iqd",
  AUD: "aud",
  SEK: "sek",
  NOK: "nok",
  DKK: "dkk",
  AZN: "azn",
  AMD: "amd",
  GEL: "gel",
  OMR: "omr",
  QAR: "qar",
  BHD: "bhd",
  HKD: "hkd",
  MYR: "myr",
  GOLD18: "gold18",
  GOLD24: "gold24",
  ABSHODEH: "mesghal",
  OUNCE: "xau",
  XAU: "xau",
  EMAMI: "emami",
  HALF: "nim",
  QUARTER: "rob",
  GRAMI: "gerami",
  BAHAR: "bahar",
  USDT: "usdt",
  BTC: "btc",
  ETH: "eth",
  TON: "ton",
  SOL: "sol",
  BNB: "bnb",
  XRP: "xrp",
  DOGE: "doge",
  TRX: "trx",
  ADA: "ada",
  LTC: "ltc",
  USDC: "usdc",
  XAG: "silver",
  SILVER999: "silver",
  XPT: "platinum",
  XCU: "copper",
  BRENT: "brent",
  WTI: "wti",
  OPEC: "opec",
  NATGAS: "natgas",
};

export function assetIconSrc(symbol: string): string | null {
  const id = ICON_IDS[symbol];
  return id ? `/icons/assets/asset-${id}-b.svg` : null;
}

export default function AssetIcon({
  rate,
  size = 40,
  className = "",
}: {
  rate: Pick<RateView, "symbol" | "countryCode" | "mark" | "category" | "nameFa">;
  /** قطر به پیکسل؛ زیر ۲۴ حلقهٔ Q ناخواناست و آیکن قدیمی استفاده می‌شود */
  size?: number;
  className?: string;
}) {
  const src = size >= 24 ? assetIconSrc(rate.symbol) : null;
  if (!src) {
    const legacy = size >= 48 ? "large" : size >= 36 ? "normal" : "small";
    return <RateIcon rate={rate} size={legacy} />;
  }
  return (
    // نام دارایی همیشه کنار آیکن خوانده می‌شود؛ alt خالی عمدی است
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 select-none ${className}`}
      draggable={false}
    />
  );
}
