import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(5) }),
});

/** ثبت یا به‌روزرسانی اشتراک وب‌پوش مرورگر. */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "اطلاعات اشتراک اعلان ناقص است." } },
      { status: 400 },
    );
  }

  const user = await getSessionUser();
  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
      userId: user?.id ?? null,
      userAgent: request.headers.get("user-agent")?.slice(0, 250) ?? null,
    },
    create: {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userId: user?.id ?? null,
      userAgent: request.headers.get("user-agent")?.slice(0, 250) ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: { code: "invalid_body", message: "endpoint لازم است." } }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
