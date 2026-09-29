import "server-only";
import { prisma } from "@qeymat/db";
import { PLANS, PLUS_PLANS, type Plan, type PlusPlan } from "@qeymat/shared";

/**
 * قیمت‌ها و تنظیمات پرداخت که مدیر از پنل تغییر می‌دهد.
 *
 * پلن‌های پیش‌فرض در packages/shared تعریف شده‌اند (شناسه، برچسب، طول دوره).
 * مدیر برای هر پلن فقط این‌ها را بازنویسی می‌کند: قیمت، فعال بودن، و سقف
 * (تعداد درخواست API یا تعداد شاخص هشدار پیامکی پلاس). بازنویسی‌ها در جدول
 * Setting با کلید plans.overrides ذخیره می‌شوند.
 */

export type PlanOverride = {
  price?: number;
  active?: boolean;
  /** سقف درخواست پلن API */
  limit?: number;
  /** سقف شاخص هشدار پیامکی پلن پلاس */
  smsAlerts?: number;
};

export type ApiPlanView = Plan & { active: boolean };
export type PlusPlanView = PlusPlan & { active: boolean };

export type CardInfo = {
  cardNumber: string;
  sheba: string;
  holder: string;
  bank: string;
  note: string;
};

export type PaymentMethods = { zarinpal: boolean; card: boolean };

export type PaymentConfig = {
  methods: PaymentMethods;
  card: CardInfo;
};

const OVERRIDES_KEY = "plans.overrides";
const METHODS_KEY = "payment.methods";
const CARD_KEY = "payment.card";

const EMPTY_CARD: CardInfo = { cardNumber: "", sheba: "", holder: "", bank: "", note: "" };

export async function readSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as T) ?? null;
}

export async function writeSetting(key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as object },
    create: { key, value: value as object },
  });
}

export async function getOverrides(): Promise<Record<string, PlanOverride>> {
  return (await readSetting<Record<string, PlanOverride>>(OVERRIDES_KEY)) ?? {};
}

export async function saveOverrides(overrides: Record<string, PlanOverride>) {
  await writeSetting(OVERRIDES_KEY, overrides);
}

/** همه‌ی پلن‌ها با قیمت و سقف‌های فعلی (غیرفعال‌ها هم، با active=false) */
export async function getPricing(): Promise<{ api: ApiPlanView[]; plus: PlusPlanView[] }> {
  const overrides = await getOverrides();
  return {
    api: PLANS.map((plan) => {
      const o = overrides[plan.id] ?? {};
      const limit = o.limit ?? plan.limit;
      return {
        ...plan,
        price: o.price ?? plan.price,
        limit,
        requests: new Intl.NumberFormat("fa-IR").format(limit),
        active: o.active ?? true,
      };
    }),
    plus: PLUS_PLANS.map((plan) => {
      const o = overrides[plan.id] ?? {};
      return {
        ...plan,
        price: o.price ?? plan.price,
        smsAlerts: o.smsAlerts ?? plan.smsAlerts,
        active: o.active ?? true,
      };
    }),
  };
}

export async function findApiPlan(id: string) {
  return (await getPricing()).api.find((plan) => plan.id === id) ?? null;
}

export async function findPlusPlan(id: string) {
  return (await getPricing()).plus.find((plan) => plan.id === id) ?? null;
}

/**
 * روش‌های پرداخت. پیش‌فرض: زرین‌پال روشن اگر مرچنت‌کد تنظیم شده باشد؛
 * کارت‌به‌کارت روشن اگر شماره کارت یا شبا ثبت شده باشد.
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const [methods, card] = await Promise.all([
    readSetting<Partial<PaymentMethods>>(METHODS_KEY),
    readSetting<Partial<CardInfo>>(CARD_KEY),
  ]);
  const cardInfo = { ...EMPTY_CARD, ...(card ?? {}) };
  const hasCard = Boolean(cardInfo.cardNumber || cardInfo.sheba);
  const hasMerchant = (process.env.ZARINPAL_MERCHANT_ID ?? "").trim().length === 36;
  return {
    methods: {
      zarinpal: (methods?.zarinpal ?? true) && hasMerchant,
      card: (methods?.card ?? true) && hasCard,
    },
    card: cardInfo,
  };
}

/** تنظیمات خام برای فرم پنل مدیریت (بدون اعمال شرط مرچنت‌کد) */
export async function getPaymentSettingsForAdmin() {
  const [methods, card] = await Promise.all([
    readSetting<Partial<PaymentMethods>>(METHODS_KEY),
    readSetting<Partial<CardInfo>>(CARD_KEY),
  ]);
  return {
    methods: { zarinpal: methods?.zarinpal ?? true, card: methods?.card ?? true },
    card: { ...EMPTY_CARD, ...(card ?? {}) },
    merchantConfigured: (process.env.ZARINPAL_MERCHANT_ID ?? "").trim().length === 36,
  };
}

export async function savePaymentSettings(methods: PaymentMethods, card: CardInfo) {
  await Promise.all([writeSetting(METHODS_KEY, methods), writeSetting(CARD_KEY, card)]);
}

/** اطلاعاتی که صفحه‌ی خرید لازم دارد: پلن‌های فعال + روش‌های پرداخت */
export async function getCheckoutData() {
  const [pricing, payment] = await Promise.all([getPricing(), getPaymentConfig()]);
  return {
    api: pricing.api.filter((plan) => plan.active),
    plus: pricing.plus.filter((plan) => plan.active),
    methods: payment.methods,
    card: payment.methods.card ? payment.card : null,
  };
}

export type CheckoutData = Awaited<ReturnType<typeof getCheckoutData>>;
