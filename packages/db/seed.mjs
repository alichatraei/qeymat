import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { prisma } = require("./index.js");

/* ------------------------------------------------------------------ *
 * منابع داده
 * ------------------------------------------------------------------ */
const sources = [
  {
    key: "nobitex",
    title: "نوبیتکس",
    adapter: "nobitex",
    endpoint: "https://api.nobitex.ir/market/stats",
    intervalSec: 30,
    config: {
      dstCurrency: "rls",
      srcCurrencies: ["btc", "eth", "usdt", "sol", "ton", "doge", "xrp", "bnb", "ada", "trx"],
    },
  },
  {
    key: "alanchand",
    title: "الان چند",
    adapter: "alanchand",
    endpoint: "https://alanchand.com/",
    intervalSec: 90,
    config: { timeoutMs: 12000 },
  },
  {
    key: "bonbast",
    title: "بن‌بست",
    adapter: "bonbast",
    endpoint: "https://bonbast.com/",
    intervalSec: 120,
    config: { timeoutMs: 12000 },
  },
  {
    key: "tgju",
    title: "TGJU",
    adapter: "tgju",
    endpoint: "https://call5.tgju.org/ajax.json",
    intervalSec: 60,
    config: {},
  },
];

/* ------------------------------------------------------------------ *
 * دارایی‌ها
 * ------------------------------------------------------------------ */
const assets = [
  // ارز — منبع اصلی الان چند، جایگزین بن‌بست
  { symbol: "USD", nameFa: "دلار آمریکا", nameEn: "US Dollar", category: "CURRENCY", countryCode: "US", sourceKey: "alanchand", sourceField: "usd", sortOrder: 1 },
  { symbol: "EUR", nameFa: "یورو", nameEn: "Euro", category: "CURRENCY", countryCode: "EU", sourceKey: "alanchand", sourceField: "eur", sortOrder: 2 },
  { symbol: "AED", nameFa: "درهم امارات", nameEn: "UAE Dirham", category: "CURRENCY", countryCode: "AE", sourceKey: "alanchand", sourceField: "aed", sortOrder: 3 },
  { symbol: "TRY", nameFa: "لیر ترکیه", nameEn: "Turkish Lira", category: "CURRENCY", countryCode: "TR", sourceKey: "alanchand", sourceField: "try", sortOrder: 4 },
  { symbol: "GBP", nameFa: "پوند انگلیس", nameEn: "British Pound", category: "CURRENCY", countryCode: "GB", sourceKey: "alanchand", sourceField: "gbp", sortOrder: 5 },
  { symbol: "CAD", nameFa: "دلار کانادا", nameEn: "Canadian Dollar", category: "CURRENCY", countryCode: "CA", sourceKey: "alanchand", sourceField: "cad", sortOrder: 6 },
  { symbol: "JPY", nameFa: "ین ژاپن", nameEn: "Japanese Yen", category: "CURRENCY", countryCode: "JP", sourceKey: "alanchand", sourceField: "jpy", sortOrder: 7 },
  { symbol: "CNY", nameFa: "یوان چین", nameEn: "Chinese Yuan", category: "CURRENCY", countryCode: "CN", sourceKey: "alanchand", sourceField: "cny", sortOrder: 8 },
  { symbol: "RUB", nameFa: "روبل روسیه", nameEn: "Russian Ruble", category: "CURRENCY", countryCode: "RU", sourceKey: "alanchand", sourceField: "rub", sortOrder: 9 },
  { symbol: "IQD", nameFa: "دینار عراق", nameEn: "Iraqi Dinar", category: "CURRENCY", countryCode: "IQ", sourceKey: "alanchand", sourceField: "iqd", sortOrder: 10 },

  // طلا و سکه — TGJU
  { symbol: "GOLD18", nameFa: "طلای ۱۸ عیار", nameEn: "18K Gold", category: "GOLD", mark: "Au", sourceLabel: "بازار طلا", sourceKey: "tgju", sourceField: "geram18", sortOrder: 1 },
  { symbol: "GOLD24", nameFa: "طلای ۲۴ عیار", nameEn: "24K Gold", category: "GOLD", mark: "Au", sourceLabel: "بازار طلا", sourceKey: "tgju", sourceField: "geram24", sortOrder: 2 },
  { symbol: "EMAMI", nameFa: "سکه امامی", nameEn: "Emami Coin", category: "GOLD", mark: "س", sourceLabel: "بازار طلا", sourceKey: "tgju", sourceField: "sekee", sortOrder: 3 },
  { symbol: "BAHAR", nameFa: "سکه بهار آزادی", nameEn: "Bahar Azadi Coin", category: "GOLD", mark: "ب", sourceLabel: "بازار طلا", sourceKey: "tgju", sourceField: "sekeb", sortOrder: 4 },
  { symbol: "HALF", nameFa: "نیم سکه", nameEn: "Half Coin", category: "GOLD", mark: "½", sourceLabel: "بازار طلا", sourceKey: "tgju", sourceField: "nim", sortOrder: 5 },
  { symbol: "QUARTER", nameFa: "ربع سکه", nameEn: "Quarter Coin", category: "GOLD", mark: "¼", sourceLabel: "بازار طلا", sourceKey: "tgju", sourceField: "rob", sortOrder: 6 },
  { symbol: "GRAMI", nameFa: "سکه گرمی", nameEn: "Gram Coin", category: "GOLD", mark: "گ", sourceLabel: "بازار طلا", sourceKey: "tgju", sourceField: "gerami", sortOrder: 7 },
  { symbol: "OUNCE", nameFa: "انس جهانی طلا", nameEn: "Gold Ounce", category: "GOLD", mark: "oz", sourceLabel: "بازار جهانی", sourceKey: "tgju", sourceField: "ons", sortOrder: 8 },

  // رمزارز — نوبیتکس (نرخ ریالی ← تومان)
  { symbol: "USDT", nameFa: "تتر", nameEn: "Tether", category: "CRYPTO", mark: "₮", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "usdt", multiplier: 0.1, sortOrder: 1 },
  { symbol: "BTC", nameFa: "بیت‌کوین", nameEn: "Bitcoin", category: "CRYPTO", mark: "₿", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "btc", multiplier: 0.1, sortOrder: 2 },
  { symbol: "ETH", nameFa: "اتریوم", nameEn: "Ethereum", category: "CRYPTO", mark: "Ξ", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "eth", multiplier: 0.1, sortOrder: 3 },
  { symbol: "SOL", nameFa: "سولانا", nameEn: "Solana", category: "CRYPTO", mark: "◎", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "sol", multiplier: 0.1, sortOrder: 4 },
  { symbol: "TON", nameFa: "تون‌کوین", nameEn: "Toncoin", category: "CRYPTO", mark: "T", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "ton", multiplier: 0.1, sortOrder: 5 },
  { symbol: "XRP", nameFa: "ریپل", nameEn: "XRP", category: "CRYPTO", mark: "✕", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "xrp", multiplier: 0.1, sortOrder: 6 },
  { symbol: "DOGE", nameFa: "دوج‌کوین", nameEn: "Dogecoin", category: "CRYPTO", mark: "Ð", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "doge", multiplier: 0.1, sortOrder: 7 },
  { symbol: "BNB", nameFa: "بی‌ان‌بی", nameEn: "BNB", category: "CRYPTO", mark: "B", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "bnb", multiplier: 0.1, sortOrder: 8 },
  { symbol: "TRX", nameFa: "ترون", nameEn: "TRON", category: "CRYPTO", mark: "T", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "trx", multiplier: 0.1, sortOrder: 9 },
  { symbol: "ADA", nameFa: "کاردانو", nameEn: "Cardano", category: "CRYPTO", mark: "₳", sourceLabel: "نوبیتکس", sourceKey: "nobitex", sourceField: "ada", multiplier: 0.1, sortOrder: 10 },
];

/* ------------------------------------------------------------------ *
 * محصولات هوش مصنوعی و پرداخت ارزی (آساپی)
 * ------------------------------------------------------------------ */
const aiProducts = [
  {
    slug: "chatgpt-plus",
    title: "ChatGPT Plus",
    subtitle: "اشتراک ماهانه روی ایمیل خودتان",
    description: "دسترسی به GPT پیشرفته، تحلیل فایل و تولید تصویر. فعال‌سازی روی حساب شخصی شما انجام می‌شود.",
    icon: "Sparkles",
    priceUsd: 20,
    period: "ماهانه",
    badge: "پرفروش",
    features: ["فعال‌سازی روی ایمیل خودتان", "تحویل کمتر از ۲ ساعت", "پشتیبانی تا پایان دوره"],
    sortOrder: 1,
  },
  {
    slug: "claude-pro",
    title: "Claude Pro",
    subtitle: "اشتراک ماهانه Anthropic",
    description: "محدودیت پیام بالاتر، پروژه‌ها و دسترسی زودهنگام به مدل‌های تازه.",
    icon: "Bot",
    priceUsd: 20,
    period: "ماهانه",
    features: ["فعال‌سازی روی ایمیل خودتان", "مناسب کار حرفه‌ای", "پشتیبانی تا پایان دوره"],
    sortOrder: 2,
  },
  {
    slug: "cursor-pro",
    title: "Cursor Pro",
    subtitle: "ادیتور کدنویسی با هوش مصنوعی",
    description: "برای توسعه‌دهنده‌هایی که روزانه با کد سر و کار دارند؛ کامل‌ترین حالت تکمیل خودکار کد.",
    icon: "Code2",
    priceUsd: 20,
    period: "ماهانه",
    features: ["فعال‌سازی روی حساب شما", "مناسب تیم‌های توسعه", "راهنمای نصب فارسی"],
    sortOrder: 3,
  },
  {
    slug: "openai-api-credit",
    title: "اعتبار OpenAI API",
    subtitle: "شارژ کیف پول توسعه‌دهنده",
    description: "شارژ اعتبار API روی حساب OpenAI شما، با نرخ روز دلار و بدون نیاز به کارت بین‌المللی.",
    icon: "Wallet",
    priceUsd: 10,
    period: "هر ۱۰ دلار",
    badge: "برای توسعه‌دهنده‌ها",
    features: ["حداقل ۱۰ دلار", "ثبت فاکتور رسمی", "تحویل همان روز"],
    sortOrder: 4,
  },
  {
    slug: "global-payment",
    title: "پرداخت ارزی دلخواه",
    subtitle: "پرداخت هر صورتحساب بین‌المللی",
    description: "هزینه سرور، دامنه، درگاه یا هر سرویس خارجی را با ریال بپردازید؛ پرداخت از طرف شما انجام می‌شود.",
    icon: "Globe",
    priceUsd: 0,
    period: "بر اساس صورتحساب",
    features: ["سرور، دامنه و ابزار توسعه", "ارسال رسید پرداخت", "کارمزد شفاف"],
    sortOrder: 5,
  },
  {
    slug: "gift-card",
    title: "گیفت‌کارت‌های بین‌المللی",
    subtitle: "اپل، گوگل‌پلی، استیم و …",
    description: "گیفت‌کارت اورجینال با کد معتبر و ضمانت فعال‌سازی.",
    icon: "Gift",
    priceUsd: 25,
    period: "از ۲۵ دلار",
    features: ["کد اورجینال", "تحویل آنی", "ضمانت فعال‌سازی"],
    sortOrder: 6,
  },
];

/* ------------------------------------------------------------------ *
 * اجرا
 * ------------------------------------------------------------------ */
async function main() {
  console.log("→ منابع نرخ");
  for (const source of sources) {
    await prisma.source.upsert({
      where: { key: source.key },
      update: {
        title: source.title,
        adapter: source.adapter,
        endpoint: source.endpoint,
        intervalSec: source.intervalSec,
        config: source.config,
      },
      create: source,
    });
  }

  console.log("→ دارایی‌ها");
  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {
        nameFa: asset.nameFa,
        nameEn: asset.nameEn,
        category: asset.category,
        countryCode: asset.countryCode ?? null,
        mark: asset.mark ?? null,
        sourceLabel: asset.sourceLabel ?? "بازار آزاد",
        sourceKey: asset.sourceKey,
        sourceField: asset.sourceField,
        multiplier: asset.multiplier ?? 1,
        sortOrder: asset.sortOrder,
      },
      create: {
        ...asset,
        sourceLabel: asset.sourceLabel ?? "بازار آزاد",
        multiplier: asset.multiplier ?? 1,
      },
    });
  }

  console.log("→ محصولات هوش مصنوعی");
  for (const product of aiProducts) {
    await prisma.aiProduct.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }

  console.log("→ تنظیمات پایه");
  const settings = [
    ["site.title", "قیمت — نرخ لحظه‌ای بازار ایران"],
    ["site.domain", "qeymat.online"],
    ["payment.wallet", process.env.USDT_WALLET_ADDRESS || ""],
    ["payment.network", "BEP20"],
    ["ai.feePercent", 10],
    ["asapay.url", process.env.ASAPAY_URL || "https://asapay.pro"],
    ["notify.newPayment", true],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@qeymat.online";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN", passwordHash },
      create: { email: adminEmail, name: "مدیر سیستم", role: "ADMIN", passwordHash },
    });
    console.log(`→ مدیر ساخته شد: ${adminEmail}`);
  } else {
    console.log("! ADMIN_PASSWORD تنظیم نشده — کاربر مدیر ساخته نشد");
  }

  const planted = await prisma.rate.count();
  if (planted === 0) {
    console.log("→ نرخ اولیه (تا اولین اجرای کرالر)");
    const seedRates = {
      USD: 231100, EUR: 268000, AED: 62920, TRY: 4840, GBP: 309500,
      CAD: 166600, JPY: 1570, CNY: 32100, RUB: 2750, IQD: 176,
      GOLD18: 15090000, GOLD24: 20120000, EMAMI: 156300000, BAHAR: 149800000,
      HALF: 84600000, QUARTER: 49800000, GRAMI: 27400000, OUNCE: 41120000,
      USDT: 230850, BTC: 17712836281, ETH: 571735960, SOL: 23092633,
      TON: 620000, XRP: 118000, DOGE: 4300, BNB: 152000000, TRX: 58000, ADA: 175000,
    };
    for (const [symbol, sell] of Object.entries(seedRates)) {
      const asset = await prisma.asset.findUnique({ where: { symbol } });
      if (!asset) continue;
      await prisma.rate.create({
        data: {
          assetId: asset.id,
          buy: Math.round(sell * 0.99),
          sell,
          changePercent: 0,
          source: asset.sourceLabel,
        },
      });
    }
  }

  console.log("✓ seed کامل شد");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
