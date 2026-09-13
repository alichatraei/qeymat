import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { sendPush } from "@/lib/notify";
import { prisma } from "@qeymat/db";

const schema = z.object({
  title: z.string().min(2).max(80),
  body: z.string().min(2).max(240),
  url: z.string().max(200).optional(),
});

/** ارسال اعلان همگانی به همه‌ی مرورگرهای مشترک. */
export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "متن اعلان نامعتبر است." } }, { status: 400 });
  }

  const subs = await prisma.pushSubscription.findMany();
  const result = await sendPush(subs, {
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url || "/",
    tag: "broadcast",
  });

  return NextResponse.json({ ok: true, ...result });
}
