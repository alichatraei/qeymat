import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/api-key";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  subject: z.string().min(3).max(120),
  category: z.string().max(40).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
  body: z.string().min(5).max(4000),
});

/** فهرست تیکت‌های کاربر جاری. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "وارد شوید." } }, { status: 401 });
  }

  const tickets = await prisma.ticket.findMany({
    where: { userId: user.id },
    orderBy: { lastReplyAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return NextResponse.json({ data: tickets });
}

/** ثبت تیکت تازه. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "وارد شوید." } }, { status: 401 });
  }

  const limit = await rateLimit(`ticket:${user.id}`, 5, 3600);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "در یک ساعت گذشته تیکت‌های زیادی ثبت کرده‌اید." } },
      { status: 429 },
    );
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: parsed.error.issues[0]?.message ?? "اطلاعات تیکت ناقص است." } },
      { status: 400 },
    );
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject.trim(),
      category: parsed.data.category?.trim() || "عمومی",
      priority: parsed.data.priority ?? "NORMAL",
      messages: {
        create: { authorId: user.id, body: parsed.data.body.trim(), fromStaff: false },
      },
    },
  });

  return NextResponse.json({ ok: true, id: ticket.id });
}
