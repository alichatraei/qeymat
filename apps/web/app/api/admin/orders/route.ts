import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  id: z.string().min(5),
  status: z.enum(["NEW", "PAID", "DELIVERED", "CANCELLED"]),
  asapayRef: z.string().max(120).optional(),
});

/** تغییر وضعیت سفارش اکانت هوش مصنوعی. */
export async function PATCH(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "درخواست نامعتبر است." } }, { status: 400 });
  }

  const order = await prisma.aiOrder.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.asapayRef ? { asapayRef: parsed.data.asapayRef } : {}),
    },
  });

  return NextResponse.json({ ok: true, order });
}
