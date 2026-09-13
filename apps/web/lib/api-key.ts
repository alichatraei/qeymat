import "server-only";
import crypto from "node:crypto";
import { prisma } from "@qeymat/db";
import { getRedis } from "./redis";

const PREFIX = "qym_live_";

export function hashKey(rawKey: string) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/** کلید تازه می‌سازد و فقط همان یک بار مقدار خام را برمی‌گرداند. */
export async function issueApiKey(userId: string, name = "کلید اصلی") {
  const random = crypto.randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, 20).toUpperCase();
  const rawKey = `${PREFIX}${random}`;

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      prefix: rawKey.slice(0, PREFIX.length + 4),
      keyHash: hashKey(rawKey),
    },
  });

  return { apiKey, rawKey };
}

export type KeyCheck =
  | { ok: true; apiKeyId: string; userId: string; remaining: number }
  | { ok: false; status: 401 | 403 | 429; code: string; message: string };

/**
 * کلید را اعتبارسنجی می‌کند، اشتراک فعال و سهمیه را می‌سنجد
 * و در صورت مجاز بودن، شمارنده‌ی مصرف را یک واحد بالا می‌برد.
 */
export async function verifyApiKey(rawKey: string | null): Promise<KeyCheck> {
  if (!rawKey) {
    return { ok: false, status: 401, code: "missing_api_key", message: "هدر X-API-Key ارسال نشده است." };
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashKey(rawKey) },
    select: { id: true, userId: true, isActive: true },
  });

  if (!apiKey || !apiKey.isActive) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "کلید API معتبر نیست." };
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId: apiKey.userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });

  if (!subscription) {
    return { ok: false, status: 403, code: "no_active_plan", message: "اشتراک فعالی روی این کلید وجود ندارد." };
  }

  if (subscription.requestsUsed >= subscription.requestLimit) {
    return { ok: false, status: 429, code: "quota_exceeded", message: "سقف درخواست‌های این دوره تمام شده است." };
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { requestsUsed: { increment: 1 } },
  });

  return {
    ok: true,
    apiKeyId: apiKey.id,
    userId: apiKey.userId,
    remaining: subscription.requestLimit - subscription.requestsUsed - 1,
  };
}

/** محدودیت نرخ ساده‌ی مبتنی بر Redis: N درخواست در پنجره‌ی ثانیه‌ای */
export async function rateLimit(identifier: string, limit = 60, windowSec = 60) {
  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: limit };

  try {
    const key = `qeymat:rl:${identifier}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

/** ثبت مصرف — در پس‌زمینه و بدون بلاک کردن پاسخ */
export function logUsage(apiKeyId: string, endpoint: string, status: number, latencyMs: number) {
  void prisma.usageLog
    .create({ data: { apiKeyId, endpoint, status, latencyMs } })
    .then(() => prisma.apiKey.update({ where: { id: apiKeyId }, data: { lastUsedAt: new Date() } }))
    .catch(() => {
      /* لاگ مصرف نباید پاسخ کاربر را خراب کند */
    });
}
