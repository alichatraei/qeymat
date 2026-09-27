/**
 * شروع پرداخت زرین‌پال از سمت مرورگر — مشترک بین خرید قیمت پلاس و پلن API.
 * مبلغ را سرور از جدول پلن‌ها می‌خواند؛ کلاینت فقط شناسه‌ی پلن را می‌فرستد.
 */
export type CheckoutKind = "PLUS_PLAN" | "API_PLAN";

export async function startCheckout(kind: CheckoutKind, plan: string, returnTo: string): Promise<string | null> {
  const response = await fetch("/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, plan }),
  }).catch(() => null);

  if (!response) return "ارتباط با سرور برقرار نشد.";

  // نشست منقضی شده: ورود و بازگشت به همین صفحه
  if (response.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
    return null;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.redirectUrl) {
    return payload?.error?.message || "اتصال به درگاه پرداخت انجام نشد.";
  }

  // انتقال به صفحه‌ی پرداخت زرین‌پال
  window.location.href = payload.redirectUrl;
  return null;
}
