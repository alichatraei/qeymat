import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";

const schema = z.object({
  symbol: z.string().min(2).max(12),
  threshold: z.number().positive(),
  direction: z.enum(["ABOVE", "BELOW"]),
  endpoint: z.string().url().optional(),
});

/**
 * ثبت هشدار قیمت. اشتراک اعلان باید از قبل ساخته شده باشد؛
 * اگر endpoint فرستاده نشود، آخرین اشتراک همان مرورگر استفاده می‌شود.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "اطلاعات هشدار نامعتبر است." } },
      { status: 400 },
    );
  }

  const { symbol, threshold, direction, endpoint } = parsed.data;

  const asset = await prisma.asset.findUnique({ where: { symbol: symbol.toUpperCase() } });
  if (!asset) {
    return NextResponse.json({ error: { code: "not_found", message: "دارایی پیدا نشد." } }, { status: 404 });
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 250) ?? null;
  const sub = endpoint
    ? await prisma.pushSubscription.findUnique({ where: { endpoint } })
    : await prisma.pushSubscription.findFirst({
        where: { userAgent },
        orderBy: { createdAt: "desc" },
      });

  if (!sub) {
    return NextResponse.json(
      { error: { code: "no_subscription", message: "ابتدا اعلان مرورگر را روشن کنید." } },
      { status: 409 },
    );
  }

  // هر مرورگر برای هر دارایی یک هشدار فعال دارد
  await prisma.priceAlert.deleteMany({ where: { subId: sub.id, assetId: asset.id, isActive: true } });
  await prisma.priceAlert.create({
    data: { subId: sub.id, assetId: asset.id, threshold, direction },
  });

  return NextResponse.json({ ok: true });
}
