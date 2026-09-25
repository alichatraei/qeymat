import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { getPlan, getPlusPlan } from "@qeymat/shared";
import { verifyPayment } from "@/lib/zarinpal";
import { issueApiKey } from "@/lib/api-key";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * بازگشت کاربر از درگاه.
 * تا وقتی verify موفق نشود هیچ اشتراکی فعال نمی‌شود، حتی اگر Status=OK باشد.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orderId = params.get("order");
  const authority = params.get("Authority") || params.get("authority");
  const status = params.get("Status") || params.get("status");

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online";
  const back = (result: string, extra = "") =>
    NextResponse.redirect(`${base}/payment/result?status=${result}${extra}`, { status: 303 });

  if (!orderId) return back("invalid");

  const order = await prisma.gatewayOrder.findUnique({ where: { id: orderId } });
  if (!order) return back("notfound");

  // سفارشی که قبلاً تأیید شده، دوباره فعال‌سازی نمی‌شود
  if (order.status === "PAID") return back("success", `&ref=${order.refId ?? ""}`);

  if (status !== "OK") {
    await prisma.gatewayOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED", failReason: "پرداخت توسط کاربر لغو شد." },
    });
    return back("cancelled");
  }

  if (!authority || (order.authority && order.authority !== authority)) {
    await prisma.gatewayOrder.update({
      where: { id: order.id },
      data: { status: "FAILED", failReason: "Authority با سفارش هم‌خوانی ندارد." },
    });
    return back("mismatch");
  }

  const verified = await verifyPayment({ amountRial: order.amountRial, authority });

  if (!verified.ok) {
    await prisma.gatewayOrder.update({
      where: { id: order.id },
      data: { status: "FAILED", failReason: `${verified.code}: ${verified.message}` },
    });
    return back("failed", `&message=${encodeURIComponent(verified.message)}`);
  }

  await prisma.gatewayOrder.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      refId: verified.refId,
      cardPan: verified.cardPan,
      paidAt: new Date(),
    },
  });

  await activate(order);

  return back("success", `&ref=${verified.refId}`);
}

/** فعال‌سازی چیزی که خریداری شده است. */
async function activate(order: {
  id: string;
  userId: string;
  kind: string;
  plan: string;
}) {
  if (order.kind === "PLUS_PLAN") {
    const plan = getPlusPlan(order.plan);
    if (!plan) return;

    // تمدید هم‌سطح از انتهای اشتراک فعلی حساب می‌شود نه از امروز؛
    // ارتقا از پلاس به حرفه‌ای همین حالا شروع می‌شود.
    const current = await prisma.plusSubscription.findFirst({
      where: { userId: order.userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
    });
    const sameTier = current && getPlusPlan(current.plan)?.tier === plan.tier;

    const startsAt = current && sameTier ? current.expiresAt : new Date();
    const expiresAt = new Date(startsAt);
    expiresAt.setMonth(expiresAt.getMonth() + plan.monthCount);

    await prisma.plusSubscription.create({
      data: { userId: order.userId, plan: plan.id, startsAt, expiresAt, orderId: order.id },
    });

    await notifyUser(order.userId, {
      title: "قیمت پلاس فعال شد",
      body: `اشتراک ${plan.tier === "pro" ? "پلاس حرفه‌ای" : "پلاس"} ${plan.label} فعال است: تحلیل قیمت و هشدار پیامکی برای ${plan.smsAlerts} شاخص.`,
      url: "/panel",
    });
    return;
  }

  const plan = getPlan(order.plan);
  if (!plan) return;

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + plan.monthCount);

  await prisma.subscription.updateMany({
    where: { userId: order.userId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });
  await prisma.subscription.create({
    data: {
      userId: order.userId,
      plan: plan.id,
      requestLimit: plan.limit,
      expiresAt,
    },
  });

  await prisma.apiKey.updateMany({
    where: { userId: order.userId, isActive: true },
    data: { isActive: false },
  });
  await issueApiKey(order.userId);

  await notifyUser(order.userId, {
    title: "وب‌سرویس شما فعال شد",
    body: `پلن ${plan.label} فعال شد و کلید API تازه در پنل آماده است.`,
    url: "/dashboard",
  });
}
