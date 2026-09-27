import "server-only";
import { prisma } from "@qeymat/db";
import { notifyUser } from "./notify";
import { findApiPlan, findPlusPlan } from "./pricing";

/**
 * فعال‌سازی خرید — مشترک بین درگاه زرین‌پال و تأیید فیش کارت‌به‌کارت.
 *
 * - قیمت پلاس: تمدید هم‌سطح از انتهای اشتراک فعلی، ارتقا از همین حالا.
 * - وب‌سرویس: زمان باقی‌مانده حفظ می‌شود، سهمیه از صفر، کلید فعلی دست نمی‌خورد.
 */
export async function activatePurchase(params: {
  userId: string;
  kind: "API_PLAN" | "PLUS_PLAN";
  planId: string;
  /** شناسه‌ی سفارش درگاه یا فیش */
  reference: string;
}): Promise<{ ok: true; label: string } | { ok: false; message: string }> {
  const { userId, kind, planId, reference } = params;

  if (kind === "PLUS_PLAN") {
    const plan = await findPlusPlan(planId);
    if (!plan) return { ok: false, message: "پلن قیمت پلاس پیدا نشد." };

    const current = await prisma.plusSubscription.findFirst({
      where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
    });
    const currentPlan = current ? await findPlusPlan(current.plan) : null;
    const sameTier = current && currentPlan?.tier === plan.tier;

    const startsAt = current && sameTier ? current.expiresAt : new Date();
    const expiresAt = new Date(startsAt);
    expiresAt.setMonth(expiresAt.getMonth() + plan.monthCount);

    await prisma.plusSubscription.create({
      data: { userId, plan: plan.id, startsAt, expiresAt, orderId: reference },
    });

    const label = `${plan.tier === "pro" ? "پلاس حرفه‌ای" : "پلاس"} ${plan.label}`;
    await notifyUser(userId, {
      title: "قیمت پلاس فعال شد",
      body: `اشتراک ${label} فعال است: تحلیل قیمت و هشدار پیامکی برای ${plan.smsAlerts} شاخص.`,
      url: "/panel",
    });
    return { ok: true, label };
  }

  const plan = await findApiPlan(planId);
  if (!plan) return { ok: false, message: "پلن وب‌سرویس پیدا نشد." };

  const current = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });
  const expiresAt = new Date(current ? current.expiresAt : new Date());
  expiresAt.setMonth(expiresAt.getMonth() + plan.monthCount);

  await prisma.subscription.updateMany({ where: { userId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
  await prisma.subscription.create({
    data: { userId, plan: plan.id, requestLimit: plan.limit, expiresAt },
  });

  const hasKey = await prisma.apiKey.count({ where: { userId, isActive: true } });
  await notifyUser(userId, {
    title: "وب‌سرویس شما فعال شد",
    body: hasKey
      ? `پلن ${plan.label} فعال شد؛ کلید فعلی‌تان بدون تغییر کار می‌کند.`
      : `پلن ${plan.label} فعال شد. کلید API را از پنل توسعه‌دهنده بسازید.`,
    url: "/dashboard",
  });
  return { ok: true, label: `وب‌سرویس ${plan.label}` };
}
