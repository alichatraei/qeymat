/**
 * ثبت سرویس‌ورکر «قیمت».
 *
 * قبلاً ثبت به رویداد load گره خورده بود؛ وقتی React بعد از load اجرا می‌شد
 * (که معمول است) سرویس‌ورکر هیچ‌وقت ثبت نمی‌شد و serviceWorker.ready برای
 * همیشه منتظر می‌ماند — دکمه‌ی «روشن کردن اعلان» روی لودینگ گیر می‌کرد.
 */
let pending: Promise<ServiceWorkerRegistration> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!pending) {
    pending = navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

/** یک promise با سقف زمانی و پیام خطای فارسی */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** سرویس‌ورکرِ فعال؛ اگر ثبت نشده بود، همین حالا ثبت می‌شود */
export async function activeServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (!existing) await registerServiceWorker();
  return withTimeout(navigator.serviceWorker.ready, 15_000, "سرویس‌ورکر سایت فعال نشد؛ صفحه را یک‌بار تازه کنید.");
}
