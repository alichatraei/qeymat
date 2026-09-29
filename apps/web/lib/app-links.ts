import { readSetting, writeSetting } from "./pricing";

/**
 * لینک‌های اپ اندروید در فروشگاه‌ها؛ از پنل مدیریت («اپ موبایل») تنظیم می‌شود.
 * تا وقتی هیچ لینکی نیست، پیام دانلود اپ به کاربر نشان داده نمی‌شود.
 */
export type AppLinks = { bazaar: string; myket: string; direct: string };

const KEY = "app.links";
const EMPTY: AppLinks = { bazaar: "", myket: "", direct: "" };

export async function getAppLinks(): Promise<AppLinks> {
  try {
    return { ...EMPTY, ...((await readSetting<Partial<AppLinks>>(KEY)) ?? {}) };
  } catch {
    // صفحه نباید به‌خاطر نبود دیتابیس (مثلاً هنگام build) از کار بیفتد
    return EMPTY;
  }
}

export async function saveAppLinks(links: AppLinks) {
  await writeSetting(KEY, links);
}

export function hasAppLinks(links: AppLinks) {
  return Boolean(links.bazaar || links.myket || links.direct);
}
