import "server-only";
import { prisma } from "@qeymat/db";
import { getPlusPlan } from "@qeymat/shared";
import type { PlusStatus } from "./types";

const NONE: PlusStatus = { active: false, plan: null, tier: null, smsLimit: 0, expiresAt: null };

/**
 * وضعیت اشتراک قیمت پلاس کاربر.
 * اگر چند اشتراک فعال هم‌زمان داشته باشد (مثلاً ارتقا از پلاس به حرفه‌ای)،
 * بیشترین سقف پیامک ملاک است.
 */
export async function getPlusStatus(userId: string | null | undefined): Promise<PlusStatus> {
  if (!userId) return NONE;

  const active = await prisma.plusSubscription.findMany({
    where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });
  if (!active.length) return NONE;

  let best = active[0];
  let bestLimit = getPlusPlan(best.plan)?.smsAlerts ?? 10;
  for (const sub of active) {
    const limit = getPlusPlan(sub.plan)?.smsAlerts ?? 10;
    if (limit > bestLimit) {
      best = sub;
      bestLimit = limit;
    }
  }

  return {
    active: true,
    plan: best.plan,
    tier: getPlusPlan(best.plan)?.tier ?? "plus",
    smsLimit: bestLimit,
    expiresAt: best.expiresAt.toISOString(),
  };
}
