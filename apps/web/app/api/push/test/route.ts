import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { sendPush } from "@/lib/notify";

const schema = z.object({ endpoint: z.string().url() });

/** فاصله‌ی کمینه بین دو اعلان آزمایشی برای یک دستگاه */
const COOLDOWN_MS = 30_000;
const lastSent = new Map<string, number>();

/**
 * اعلان آزمایشی به همان دستگاهی که تازه اعلان را روشن کرده؛ نشان می‌دهد
 * مسیر کامل سرور ← سرویس پوش مرورگر ← گوشی کار می‌کند.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "endpoint لازم است." } }, { status: 400 });
  }
  const { endpoint } = parsed.data;
  const now = Date.now();
  if (now - (lastSent.get(endpoint) ?? 0) < COOLDOWN_MS) {
    return NextResponse.json({ sent: 0, failed: 0, error: "کمی صبر کنید و دوباره امتحان کنید." }, { status: 429 });
  }
  lastSent.set(endpoint, now);

  const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (!sub) {
    return NextResponse.json({ error: { code: "not_found", message: "این دستگاه اشتراک اعلان ندارد." } }, { status: 404 });
  }

  const result = await sendPush([sub], {
    title: "اعلان‌های «قیمت» روشن شد ✅",
    body: "از این به بعد هشدارهای قیمت همین‌جا می‌رسد.",
    url: "/panel",
    tag: "push-test",
  });
  return NextResponse.json(result);
}
