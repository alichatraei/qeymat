import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { getPlan, getPlusPlan } from "@qeymat/shared";
import { requestPayment, tomanToRial } from "@/lib/zarinpal";

export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["API_PLAN", "PLUS_PLAN"]),
  plan: z.string().min(2).max(40),
});

/**
 * ساخت سفارش و گرفتن لینک پرداخت زرین‌پال.
 * مبلغ همیشه روی سرور از جدول پلن‌ها خوانده می‌شود، نه از ورودی کلاینت.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "برای خرید ابتدا وارد شوید." } },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "درخواست نامعتبر است." } },
      { status: 400 },
    );
  }

  const { kind, plan: planId } = parsed.data;
  const plan = kind === "API_PLAN" ? getPlan(planId) : getPlusPlan(planId);

  if (!plan) {
    return NextResponse.json(
      { error: { code: "invalid_plan", message: "پلن انتخابی معتبر نیست." } },
      { status: 400 },
    );
  }

  const amountRial = tomanToRial(plan.price);

  const order = await prisma.gatewayOrder.create({
    data: { userId: user.id, kind, plan: plan.id, amountRial },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online";
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, email: true },
  });

  const result = await requestPayment({
    amountRial,
    description:
      kind === "PLUS_PLAN"
        ? `اشتراک قیمت پلاس — ${plan.label}`
        : `وب‌سرویس قیمت — پلن ${plan.label}`,
    callbackUrl: `${base}/api/payment/callback?order=${order.id}`,
    mobile: dbUser?.phone ?? null,
    email: dbUser?.email ?? null,
    orderId: order.id,
  });

  if (!result.ok) {
    await prisma.gatewayOrder.update({
      where: { id: order.id },
      data: { status: "FAILED", failReason: `${result.code}: ${result.message}` },
    });
    return NextResponse.json(
      { error: { code: "gateway_error", message: result.message } },
      { status: 502 },
    );
  }

  await prisma.gatewayOrder.update({
    where: { id: order.id },
    data: { authority: result.authority },
  });

  return NextResponse.json({ ok: true, redirectUrl: result.redirectUrl, orderId: order.id });
}
