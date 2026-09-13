import "server-only";

/**
 * ارسال پیامک کد ورود.
 *
 * ارائه‌دهنده با SMS_PROVIDER انتخاب می‌شود. اگر تنظیم نشده باشد، کد فقط
 * در لاگ سرور چاپ می‌شود — برای توسعه‌ی محلی کافی است و باعث نمی‌شود
 * جریان ورود در محیط dev قفل شود.
 *
 * افزودن ارائه‌دهنده‌ی تازه: یک تابع در PROVIDERS اضافه کنید.
 */

type SendResult = { ok: boolean; error?: string };

const PROVIDERS: Record<string, (phone: string, code: string) => Promise<SendResult>> = {
  /** کاوه‌نگار — ارسال با الگوی تأییدیه */
  kavenegar: async (phone, code) => {
    const apiKey = process.env.SMS_API_KEY;
    const template = process.env.SMS_TEMPLATE || "qeymat-otp";
    if (!apiKey) return { ok: false, error: "SMS_API_KEY تنظیم نشده است." };

    const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?receptor=${encodeURIComponent(
      phone,
    )}&token=${encodeURIComponent(code)}&template=${encodeURIComponent(template)}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const payload = await response.json().catch(() => null);
    if (payload?.return?.status === 200) return { ok: true };
    return { ok: false, error: payload?.return?.message || `کاوه‌نگار: ${response.status}` };
  },

  /** SMS.ir — ارسال تأییدیه نسخه ۳ */
  smsir: async (phone, code) => {
    const apiKey = process.env.SMS_API_KEY;
    const templateId = Number(process.env.SMS_TEMPLATE || 0);
    if (!apiKey || !templateId) {
      return { ok: false, error: "SMS_API_KEY یا SMS_TEMPLATE تنظیم نشده است." };
    }

    const response = await fetch("https://api.sms.ir/v1/send/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        mobile: phone,
        templateId,
        parameters: [{ name: "CODE", value: code }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null);
    if (payload?.status === 1) return { ok: true };
    return { ok: false, error: payload?.message || `SMS.ir: ${response.status}` };
  },

  /** ملی‌پیامک — متد الگو */
  melipayamak: async (phone, code) => {
    const url = process.env.SMS_API_KEY; // آدرس کامل وب‌سرویس shared
    const bodyId = Number(process.env.SMS_TEMPLATE || 0);
    if (!url || !bodyId) {
      return { ok: false, error: "SMS_API_KEY یا SMS_TEMPLATE تنظیم نشده است." };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyId, to: phone, args: [code] }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.Value && Number(payload.Value) > 1000) return { ok: true };
    return { ok: false, error: payload?.Message || `ملی‌پیامک: ${response.status}` };
  },
};

export async function sendOtpSms(phone: string, code: string): Promise<SendResult> {
  const provider = process.env.SMS_PROVIDER;

  if (!provider) {
    // حالت توسعه: کد در لاگ سرور دیده می‌شود
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[OTP] کد ورود برای ${phone}: ${code}\n`);
      return { ok: true };
    }
    return { ok: false, error: "سرویس پیامک پیکربندی نشده است." };
  }

  const send = PROVIDERS[provider];
  if (!send) return { ok: false, error: `ارائه‌دهنده‌ی «${provider}» پشتیبانی نمی‌شود.` };

  try {
    return await send(phone, code);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ارسال پیامک ناموفق بود." };
  }
}
