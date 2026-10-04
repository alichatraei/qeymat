/**
 * fetch با تلاش دوباره فقط برای خطای شبکه (نه پاسخ خطای سرور).
 *
 * در نسخه‌ی نصب‌شده روی آیفون، اولین درخواست بعد از برگشتن برنامه از پس‌زمینه
 * گاهی بی‌پاسخ با «Load failed» شکست می‌خورد تا اتصال دوباره برقرار شود.
 */
export async function fetchRetry(input: RequestInfo, init?: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
}

/** پیام خطای شبکه برای کاربر، با علت فنی کوتاه برای گزارش */
export function networkErrorMessage(error: unknown) {
  const reason = error instanceof Error && error.message ? ` (${error.message})` : "";
  return `ارتباط با سرور برقرار نشد${reason}. اینترنت را بررسی کنید و دوباره امتحان کنید.`;
}
