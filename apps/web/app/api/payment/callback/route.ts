import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { verifyPayment } from "@/lib/zarinpal";
import { activatePurchase } from "@/lib/activation";

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
  let product = "";
  const back = (result: string, extra = "") =>
    NextResponse.redirect(`${base}/payment/result?status=${result}${product}${extra}`, { status: 303 });

  if (!orderId) return back("invalid");

  const order = await prisma.gatewayOrder.findUnique({ where: { id: orderId } });
  if (!order) return back("notfound");
  product = `&product=${order.kind === "API_PLAN" ? "api" : "plus"}`;

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

  // «ادعای» اتمی سفارش: اگر کاربر دو بار از درگاه برگردد (یا صفحه را تازه کند)،
  // فقط یکی از درخواست‌ها اشتراک را فعال می‌کند.
  const claimed = await prisma.gatewayOrder.updateMany({
    where: { id: order.id, status: { not: "PAID" } },
    data: {
      status: "PAID",
      refId: verified.refId,
      cardPan: verified.cardPan,
      paidAt: new Date(),
      failReason: null,
    },
  });
  if (claimed.count === 0) return back("success", `&ref=${verified.refId}`);

  await activatePurchase({
    userId: order.userId,
    kind: order.kind,
    planId: order.plan,
    reference: order.id,
  });

  return back("success", `&ref=${verified.refId}`);
}
