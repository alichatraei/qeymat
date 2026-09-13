import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

const replySchema = z.object({ body: z.string().min(2).max(4000) });

/** خواندن یک تیکت با همه‌ی پیام‌ها. مدیر به همه‌ی تیکت‌ها دسترسی دارد. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "وارد شوید." } }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, phone: true, email: true } },
    },
  });

  if (!ticket || (ticket.userId !== user.id && user.role !== "ADMIN")) {
    return NextResponse.json({ error: { code: "not_found", message: "تیکت پیدا نشد." } }, { status: 404 });
  }

  return NextResponse.json({ data: ticket });
}

/** پاسخ به تیکت — از سمت کاربر یا پشتیبانی. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "وارد شوید." } }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });

  if (!ticket || (ticket.userId !== user.id && user.role !== "ADMIN")) {
    return NextResponse.json({ error: { code: "not_found", message: "تیکت پیدا نشد." } }, { status: 404 });
  }
  if (ticket.status === "CLOSED") {
    return NextResponse.json(
      { error: { code: "closed", message: "این تیکت بسته شده است." } },
      { status: 409 },
    );
  }

  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "متن پاسخ کوتاه است." } }, { status: 400 });
  }

  const fromStaff = user.role === "ADMIN";

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: user.id, body: parsed.data.body.trim(), fromStaff },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: fromStaff ? "ANSWERED" : "OPEN", lastReplyAt: new Date() },
    }),
  ]);

  // کاربر باید بداند پشتیبانی جواب داده است
  if (fromStaff) {
    await notifyUser(ticket.userId, {
      title: "پاسخ پشتیبانی",
      body: `تیکت «${ticket.subject}» پاسخ داده شد.`,
      url: `/panel/tickets/${ticket.id}`,
    });
  }

  return NextResponse.json({ ok: true });
}

/** بستن یا بازکردن تیکت. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "وارد شوید." } }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || (ticket.userId !== user.id && user.role !== "ADMIN")) {
    return NextResponse.json({ error: { code: "not_found", message: "تیکت پیدا نشد." } }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (!["OPEN", "ANSWERED", "CLOSED"].includes(status)) {
    return NextResponse.json({ error: { code: "invalid_body", message: "وضعیت نامعتبر است." } }, { status: 400 });
  }
  // کاربر عادی فقط اجازه‌ی بستن دارد
  if (user.role !== "ADMIN" && status !== "CLOSED") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }

  await prisma.ticket.update({ where: { id: ticket.id }, data: { status } });
  return NextResponse.json({ ok: true });
}
