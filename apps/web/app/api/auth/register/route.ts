import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { createSession, hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ حرف باشد").max(80),
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(8, "گذرواژه باید حداقل ۸ کاراکتر باشد").max(200),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است." } },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: { code: "email_taken", message: "این ایمیل قبلاً ثبت شده است." } },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  return NextResponse.json({ ok: true });
}
