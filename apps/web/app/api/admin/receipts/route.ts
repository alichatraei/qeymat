import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { activatePurchase } from "@/lib/activation";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().min(5),
  action: z.enum(["approve", "reject"]),
  note: z.string().max(300).optional(),
});

/** تأیید یا رد فیش کارت‌به‌کارت. تأیید، اشتراک را فعال می‌کند. */
export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "درخواست نامعتبر است." } }, { status: 400 });
  }
  const { id, action, note } = parsed.data;

  const receipt = await prisma.receiptPayment.findUnique({ where: { id } });
  if (!receipt) {
    return NextResponse.json({ error: { code: "not_found", message: "فیش پیدا نشد." } }, { status: 404 });
  }

  // ادعای اتمی: دو مدیر هم‌زمان یک فیش را دو بار فعال نکنند
  const claimed = await prisma.receiptPayment.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      adminNote: note ?? null,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: { code: "already_reviewed", message: "این فیش قبلاً بررسی شده است." } },
      { status: 409 },
    );
  }

  if (action === "reject") {
    await notifyUser(receipt.userId, {
      title: "فیش واریزی تأیید نشد",
      body: note || "فیش ارسالی تأیید نشد. برای پیگیری تیکت ثبت کنید.",
      url: "/me",
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  const result = await activatePurchase({
    userId: receipt.userId,
    kind: receipt.kind,
    planId: receipt.plan,
    reference: `receipt:${receipt.id}`,
  });
  if (!result.ok) {
    // فعال‌سازی نشد؛ فیش به صف برمی‌گردد تا مدیر دوباره تصمیم بگیرد
    await prisma.receiptPayment.update({
      where: { id },
      data: { status: "PENDING", reviewedAt: null, reviewedById: null },
    });
    return NextResponse.json({ error: { code: "activation_failed", message: result.message } }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: "APPROVED", label: result.label });
}
