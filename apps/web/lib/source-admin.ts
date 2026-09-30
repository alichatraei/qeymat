import "server-only";
import { readSetting, writeSetting } from "./pricing";

/**
 * مدیریت منابع نرخ از پنل: آداپتورهای قابل انتخاب، منابع/جفت‌های «بی‌اثر»
 * (خوانده و نمایش داده می‌شوند ولی در نرخ اثر ندارند) و فهرست منابع حذف‌شده
 * (تا seed آن‌ها را در استقرار بعدی دوباره نسازد).
 *
 * worker همین تنظیمات را می‌خواند: engine.muted در apps/worker/src/aggregate.js
 * و sources.removed در packages/db/seed.mjs.
 */
export const ADAPTERS = [
  { id: "custom-json", label: "JSON دلخواه (هر API)" },
  { id: "telegram", label: "کانال‌های تلگرام" },
  { id: "tgju", label: "TGJU" },
  { id: "alanchand", label: "الان‌چند" },
  { id: "bonbast", label: "بن‌بست" },
  { id: "nobitex", label: "نوبیتکس" },
  { id: "bitpin", label: "بیت‌پین" },
  { id: "wallex", label: "والکس" },
  { id: "tabdeal", label: "صرافی تبدیل" },
  { id: "arzdigital", label: "ارزدیجیتال" },
  { id: "navasan", label: "نوسان (وب‌سرویس)" },
  { id: "twelvedata", label: "TwelveData" },
] as const;

export type Muted = { sources: string[]; pairs: Record<string, string[]> };

const MUTED_KEY = "engine.muted";
const REMOVED_KEY = "sources.removed";

export async function getMuted(): Promise<Muted> {
  const value = await readSetting<Partial<Muted>>(MUTED_KEY);
  return { sources: value?.sources ?? [], pairs: value?.pairs ?? {} };
}

export async function setMuted(key: string, muted: boolean, symbol?: string) {
  const current = await getMuted();
  const toggle = (list: string[]) => (muted ? [...new Set([...list, key])] : list.filter((item) => item !== key));
  if (symbol) {
    const pairs = { ...current.pairs, [symbol]: toggle(current.pairs[symbol] ?? []) };
    if (!pairs[symbol].length) delete pairs[symbol];
    await writeSetting(MUTED_KEY, { ...current, pairs });
  } else {
    await writeSetting(MUTED_KEY, { ...current, sources: toggle(current.sources) });
  }
}

export async function markRemoved(key: string, removed: boolean) {
  const list = (await readSetting<string[]>(REMOVED_KEY)) ?? [];
  const next = removed ? [...new Set([...list, key])] : list.filter((item) => item !== key);
  await writeSetting(REMOVED_KEY, next);
}
