import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { issueApiKey } from "@/lib/api-key";
import { getPlan } from "@qeymat/shared";
import { notifyUser } from "@/lib/notify";

const schema = z.object({
  id: z.string().min(5),
  action: z.enum(["approve", "reject"]),
  note: z.string().max(300).optional(),
});

/**
 * تأیید یا رد پرداخت.
 * تأیید یعنی: ساخت اشتراک فعال، صدور کلید API و ارسال اعلان به کاربر.
 */
export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "درخواست نامعتبر است." } }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.id } });
  if (!payment) {
    return NextResponse.json({ error: { code: "not_found", message: "پرداخت پیدا نشد." } }, { status: 404 });
  }
  if (payment.status !== "PENDING") {
    return NextResponse.json(
      { error: { code: "already_reviewed", message: "این پرداخت قبلاً بررسی شده است." } },
      { status: 409 },
    );
  }

  if (parsed.data.action === "reject") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REJECTED", reviewedAt: new Date(), note: parsed.data.note ?? null },
    });
    await notifyUser(payment.userId, {
      title: "پرداخت تأیید نشد",
      body: parsed.data.note || "هش تراکنش ارسالی تأیید نشد. لطفاً دوباره بررسی کنید.",
      url: "/dashboard",
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  const plan = getPlan(payment.plan);
  if (!plan) {
    return NextResponse.json({ error: { code: "invalid_plan", message: "پلن این پرداخت معتبر نیست." } }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + plan.monthCount);

  const [, , issued] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
    prisma.subscription.updateMany({
      where: { userId: payment.userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    }),
    prisma.subscription.create({
      data: {
        userId: payment.userId,
        plan: plan.id,
        requestLimit: plan.limit,
        expiresAt,
      },
    }),
  ]);

  await prisma.apiKey.updateMany({
    where: { userId: payment.userId, isActive: true },
    data: { isActive: false },
  });
  await issueApiKey(payment.userId);

  await notifyUser(payment.userId, {
    title: "اشتراک شما فعال شد",
    body: `پلن ${plan.label} فعال شد و کلید API تازه در پنل شما آماده است.`,
    url: "/dashboard",
  });

  return NextResponse.json({ ok: true, status: "APPROVED", subscriptionId: issued.id });
}
