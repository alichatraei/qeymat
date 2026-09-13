import Redis from "ioredis";

const url = process.env.REDIS_URL;

declare global {
  // eslint-disable-next-line no-var
  var __qeymatRedis: Redis | undefined;
}

/** اتصال Redis اختیاری است؛ نبودش فقط یعنی خواندن مستقیم از دیتابیس. */
export function getRedis(): Redis | null {
  if (!url) return null;
  if (!global.__qeymatRedis) {
    const client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false });
    client.on("error", () => {
      /* در صورت قطعی، fallback به دیتابیس انجام می‌شود */
    });
    global.__qeymatRedis = client;
  }
  return global.__qeymatRedis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedis()?.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 30) {
  try {
    await getRedis()?.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* کش بهینه‌سازی است، نه الزام */
  }
}
