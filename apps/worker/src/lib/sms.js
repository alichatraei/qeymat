import { log } from "./log.js";

/**
 * پیامک هشدار قیمت (فقط مشترکان قیمت پلاس).
 *
 * مثل کد ورود از الگوی از پیش تأییدشده‌ی پنل پیامک استفاده می‌کند، چون
 * ارسال متن آزاد از خطوط خدماتی ایران مجاز نیست. الگوی کاوه‌نگار نمونه:
 *
 *   هشدار قیمت: %token10 به %token تومان رسید.
 *   قیمت | qeymat.online
 *
 * token  ← قیمت (فقط رقم، بدون فاصله)
 * token2 ← نماد (USD)
 * token10 ← نام فارسی دارایی (فاصله مجاز است)
 *
 * نام الگو در SMS_ALERT_TEMPLATE؛ اگر خالی باشد پیامک هشدار ارسال نمی‌شود.
 */
const PROVIDERS = {
  kavenegar: async ({ phone, price, symbol, name }) => {
    const apiKey = process.env.SMS_API_KEY;
    const template = process.env.SMS_ALERT_TEMPLATE;
    const params = new URLSearchParams({
      receptor: phone,
      token: String(Math.round(price)),
      token2: symbol,
      token10: name,
      template,
    });
    const response = await fetch(
      `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?${params}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const payload = await response.json().catch(() => null);
    if (payload?.return?.status === 200) return true;
    throw new Error(payload?.return?.message || `کاوه‌نگار: ${response.status}`);
  },

  smsir: async ({ phone, price, symbol, name }) => {
    const response = await fetch("https://api.sms.ir/v1/send/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": process.env.SMS_API_KEY,
      },
      body: JSON.stringify({
        mobile: phone,
        templateId: Number(process.env.SMS_ALERT_TEMPLATE),
        parameters: [
          { name: "PRICE", value: String(Math.round(price)) },
          { name: "SYMBOL", value: symbol },
          { name: "NAME", value: name },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null);
    if (payload?.status === 1) return true;
    throw new Error(payload?.message || `SMS.ir: ${response.status}`);
  },

  melipayamak: async ({ phone, price, name }) => {
    const response = await fetch(process.env.SMS_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bodyId: Number(process.env.SMS_ALERT_TEMPLATE),
        to: phone,
        args: [name, String(Math.round(price))],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && Number(payload?.Value) > 1000) return true;
    throw new Error(payload?.Message || `ملی‌پیامک: ${response.status}`);
  },
};

export function smsAlertsEnabled() {
  return Boolean(
    process.env.SMS_PROVIDER && process.env.SMS_API_KEY && process.env.SMS_ALERT_TEMPLATE,
  );
}

export async function sendAlertSms(message) {
  const provider = process.env.SMS_PROVIDER;
  if (!smsAlertsEnabled()) {
    log.info(`[sms] (غیرفعال) ${message.phone}: ${message.name} ← ${message.price}`);
    return false;
  }
  const send = PROVIDERS[provider];
  if (!send) {
    log.warn(`[sms] ارائه‌دهنده‌ی «${provider}» پشتیبانی نمی‌شود`);
    return false;
  }
  try {
    return await send(message);
  } catch (error) {
    log.warn(`[sms] ارسال به ${message.phone.slice(0, 4)}*** ناموفق: ${error?.message || error}`);
    return false;
  }
}
