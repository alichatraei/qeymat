import "server-only";

/**
 * درگاه زرین‌پال — نسخه‌ی v4 (REST/JSON).
 *
 * مبالغ همیشه به **ریال** فرستاده می‌شوند. در سراسر سایت قیمت‌ها تومانی
 * نمایش داده می‌شوند، پس تبدیل دقیقاً همین‌جا و یک‌جا انجام می‌شود تا
 * جای دیگری اشتباه ضرب‌در‌ده اتفاق نیفتد.
 *
 * حالت sandbox با ZARINPAL_SANDBOX=true فعال می‌شود.
 */

const sandbox = process.env.ZARINPAL_SANDBOX === "true";

const BASE = sandbox
  ? "https://sandbox.zarinpal.com/pg"
  : "https://payment.zarinpal.com/pg";

const API = `${BASE}/v4/payment`;
const STARTPAY = `${BASE}/StartPay`;

function merchantId() {
  const id = process.env.ZARINPAL_MERCHANT_ID;
  if (!id || id.length !== 36) {
    throw new Error("ZARINPAL_MERCHANT_ID تنظیم نشده یا طول آن ۳۶ کاراکتر نیست.");
  }
  return id;
}

export function tomanToRial(toman: number) {
  return Math.round(toman) * 10;
}

export function rialToToman(rial: number) {
  return Math.round(rial / 10);
}

type RequestResult =
  | { ok: true; authority: string; redirectUrl: string }
  | { ok: false; code: number; message: string };

/**
 * مرحله‌ی اول: گرفتن Authority و ساخت لینک پرداخت.
 * @param amountRial مبلغ به ریال
 */
export async function requestPayment(params: {
  amountRial: number;
  description: string;
  callbackUrl: string;
  mobile?: string | null;
  email?: string | null;
  orderId?: string;
}): Promise<RequestResult> {
  try {
    const response = await fetch(`${API}/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId(),
        amount: params.amountRial,
        description: params.description,
        callback_url: params.callbackUrl,
        metadata: {
          ...(params.mobile ? { mobile: params.mobile } : {}),
          ...(params.email ? { email: params.email } : {}),
          ...(params.orderId ? { order_id: params.orderId } : {}),
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    const payload = await response.json();
    const data = payload?.data;

    if (data && data.code === 100 && data.authority) {
      return {
        ok: true,
        authority: data.authority,
        redirectUrl: `${STARTPAY}/${data.authority}`,
      };
    }

    // زرین‌پال خطاها را گاهی در errors آرایه و گاهی شیء برمی‌گرداند
    const errors = payload?.errors;
    const code = Number(errors?.code ?? data?.code ?? -1);
    return { ok: false, code, message: describe(code, errors?.message) };
  } catch (error) {
    return {
      ok: false,
      code: -1,
      message: error instanceof Error ? error.message : "ارتباط با درگاه برقرار نشد.",
    };
  }
}

type VerifyResult =
  | { ok: true; refId: string; cardPan: string | null; alreadyVerified: boolean }
  | { ok: false; code: number; message: string };

/**
 * مرحله‌ی دوم: تأیید پرداخت پس از بازگشت کاربر از درگاه.
 * تا وقتی این مرحله موفق نشود، پول به حساب ننشسته است.
 */
export async function verifyPayment(params: {
  amountRial: number;
  authority: string;
}): Promise<VerifyResult> {
  try {
    const response = await fetch(`${API}/verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId(),
        amount: params.amountRial,
        authority: params.authority,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const payload = await response.json();
    const data = payload?.data;

    // ۱۰۰ یعنی تأیید شد، ۱۰۱ یعنی قبلاً تأیید شده بود
    if (data && (data.code === 100 || data.code === 101)) {
      return {
        ok: true,
        refId: String(data.ref_id),
        cardPan: data.card_pan ?? null,
        alreadyVerified: data.code === 101,
      };
    }

    const errors = payload?.errors;
    const code = Number(errors?.code ?? data?.code ?? -1);
    return { ok: false, code, message: describe(code, errors?.message) };
  } catch (error) {
    return {
      ok: false,
      code: -1,
      message: error instanceof Error ? error.message : "تأیید پرداخت انجام نشد.",
    };
  }
}

/** ترجمه‌ی کدهای رایج زرین‌پال به پیام فارسی قابل نمایش. */
function describe(code: number, fallback?: string) {
  const messages: Record<number, string> = {
    [-9]: "اطلاعات ارسالی به درگاه نامعتبر است.",
    [-10]: "آی‌پی یا کلید پذیرنده درست نیست.",
    [-11]: "درخواست مورد نظر یافت نشد.",
    [-12]: "امکان ویرایش درخواست وجود ندارد.",
    [-15]: "درگاه پذیرنده تعلیق شده است.",
    [-16]: "سطح تأیید پذیرنده پایین‌تر از حد مجاز است.",
    [-30]: "پذیرنده اجازه‌ی این تراکنش را ندارد.",
    [-31]: "حساب بانکی پذیرنده تأیید نشده است.",
    [-33]: "مبلغ تراکنش با مبلغ پرداخت‌شده هم‌خوانی ندارد.",
    [-34]: "سقف تقسیم تراکنش رد شده است.",
    [-40]: "دسترسی به متد مورد نظر مجاز نیست.",
    [-50]: "مبلغ پرداخت‌شده با مبلغ ارسالی یکی نیست.",
    [-51]: "پرداخت ناموفق بود.",
    [-52]: "خطای غیرمنتظره در درگاه. با پشتیبانی زرین‌پال تماس بگیرید.",
    [-53]: "این پرداخت متعلق به پذیرنده‌ی دیگری است.",
    [-54]: "شناسه‌ی پرداخت نامعتبر است.",
    101: "این تراکنش پیش‌تر تأیید شده است.",
  };
  return messages[code] || fallback || "پرداخت انجام نشد.";
}
