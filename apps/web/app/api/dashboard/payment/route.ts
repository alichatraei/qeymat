import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { getPlan } from "@qeymat/shared";

const schema = z.object({
  plan: z.string().min(2),
  txHash: z.string().min(10).max(120),
});

/** ثبت هش پرداخت تتری برای بررسی دستی توسط مدیر. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "ابتدا وارد شوید." } }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "هش تراکنش یا پلن نامعتبر است." } },
      { status: 400 },
    );
  }

  const plan = getPlan(parsed.data.plan);
  if (!plan) {
    return NextResponse.json({ error: { code: "invalid_plan", message: "پلن انتخابی معتبر نیست." } }, { status: 400 });
  }

  const txHash = parsed.data.txHash.trim();
  const duplicate = await prisma.payment.findFirst({ where: { txHash } });
  if (duplicate) {
    return NextResponse.json(
      { error: { code: "duplicate_hash", message: "این هش قبلاً ثبت شده است." } },
      { status: 409 },
    );
  }

  await prisma.payment.create({
    data: { userId: user.id, plan: plan.id, amountUsdt: plan.price, txHash },
  });

  return NextResponse.json({ ok: true });
}
