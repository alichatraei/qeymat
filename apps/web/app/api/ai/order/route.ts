import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { getRate, getSetting } from "@/lib/market";
import { tomanPrice } from "@qeymat/shared";
import { rateLimit } from "@/lib/api-key";

const schema = z.object({
  slug: z.string().min(2).max(60),
  fullName: z.string().min(2).max(80),
  contact: z.string().min(4).max(120),
  note: z.string().max(600).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  const limit = await rateLimit(`ai-order:${ip}`, 6, 600);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "تعداد سفارش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید." } },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "اطلاعات سفارش کامل نیست." } },
      { status: 400 },
    );
  }

  const product = await prisma.aiProduct.findUnique({ where: { slug: parsed.data.slug } });
  if (!product || !product.isActive) {
    return NextResponse.json(
      { error: { code: "not_found", message: "این سرویس در دسترس نیست." } },
      { status: 404 },
    );
  }

  const [user, usd, defaultFee] = await Promise.all([
    getSessionUser(),
    getRate("USD"),
    getSetting<number>("ai.feePercent", 10),
  ]);

  // قیمت روی سرور دوباره محاسبه می‌شود تا مقدار ارسالی کلاینت مبنا نباشد
  const amountToma =
    product.fixedToman ??
    tomanPrice(product.priceUsd, usd?.sell ?? 0, product.feePercent ?? defaultFee);

  const order = await prisma.aiOrder.create({
    data: {
      productId: product.id,
      userId: user?.id ?? null,
      fullName: parsed.data.fullName.trim(),
      contact: parsed.data.contact.trim(),
      note: parsed.data.note?.trim() || null,
      amountToma,
    },
  });

  return NextResponse.json({ ok: true, orderId: order.id, amountToma });
}
