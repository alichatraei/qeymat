import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { getPlusStatus } from "@/lib/plus";
import { fa } from "@qeymat/shared";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  symbol: z.string().min(2).max(16),
  threshold: z.number().positive(),
  direction: z.enum(["ABOVE", "BELOW"]).optional(),
  sms: z.boolean().optional(),
});

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * هشدارهای قیمت کاربر.
 *
 * - هشدار فقط برای کاربر واردشده با شماره موبایل ثبت می‌شود.
 * - اعلان مرورگر برای همه‌ی کاربران واردشده رایگان است.
 * - پیامک فقط برای مشترکان قیمت پلاس، روی حداکثر N شاخص (۱۰ در پلاس،
 *   ۵۰ در پلاس حرفه‌ای). شمارش بر اساس دارایی است، نه تعداد هشدار.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return error("unauthenticated", "برای مدیریت هشدارها وارد شوید.", 401);

  const [alerts, plus] = await Promise.all([
    prisma.priceAlert.findMany({
      where: { userId: user.id },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { asset: { select: { symbol: true, nameFa: true, unit: true, rate: { select: { sell: true } } } } },
    }),
    getPlusStatus(user.id),
  ]);

  const smsAssets = new Set(alerts.filter((a) => a.isActive && a.sms).map((a) => a.assetId));

  return NextResponse.json({
    plus,
    smsUsed: smsAssets.size,
    alerts: alerts.map((alert) => ({
      id: alert.id,
      symbol: alert.asset.symbol,
      nameFa: alert.asset.nameFa,
      unit: alert.asset.unit,
      current: alert.asset.rate?.sell ?? null,
      direction: alert.direction,
      threshold: alert.threshold,
      push: alert.push,
      sms: alert.sms,
      isActive: alert.isActive,
      firedAt: alert.firedAt?.toISOString() ?? null,
      createdAt: alert.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.phone) {
    return error("unauthenticated", "برای ثبت هشدار قیمت، ابتدا با شماره موبایل وارد شوید.", 401);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("invalid_body", "اطلاعات هشدار نامعتبر است.", 400);

  const { symbol, threshold, sms = false } = parsed.data;
  const asset = await prisma.asset.findUnique({
    where: { symbol: symbol.toUpperCase() },
    include: { rate: { select: { sell: true } } },
  });
  if (!asset) return error("not_found", "دارایی پیدا نشد.", 404);

  const direction =
    parsed.data.direction ?? (asset.rate && threshold < asset.rate.sell ? "BELOW" : "ABOVE");

  if (sms) {
    const plus = await getPlusStatus(user.id);
    if (!plus.active) {
      return error("plus_required", "هشدار پیامکی مخصوص مشترکان قیمت پلاس است.", 402);
    }

    const active = await prisma.priceAlert.findMany({
      where: { userId: user.id, isActive: true, sms: true },
      select: { assetId: true },
    });
    const assets = new Set(active.map((row) => row.assetId));
    if (!assets.has(asset.id) && assets.size >= plus.smsLimit) {
      return error(
        "sms_limit",
        plus.tier === "pro"
          ? `سقف هشدار پیامکی پلن شما ${fa(plus.smsLimit)} شاخص است.`
          : `در پلن فعلی تا ${fa(plus.smsLimit)} شاخص هشدار پیامکی دارید. برای شاخص‌های بیشتر، پلاس حرفه‌ای را بگیرید.`,
        403,
      );
    }
  }

  // هر کاربر برای هر دارایی و هر جهت یک هشدار فعال دارد
  await prisma.priceAlert.updateMany({
    where: { userId: user.id, assetId: asset.id, direction, isActive: true },
    data: { isActive: false },
  });

  const alert = await prisma.priceAlert.create({
    data: { userId: user.id, assetId: asset.id, threshold, direction, push: true, sms },
  });

  return NextResponse.json({ ok: true, id: alert.id, direction });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return error("unauthenticated", "وارد نشده‌اید.", 401);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return error("invalid_query", "شناسه‌ی هشدار لازم است.", 400);

  await prisma.priceAlert.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
