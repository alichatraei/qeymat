import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { createSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "ایمیل یا گذرواژه وارد نشده است." } },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });

  // پیام یکسان برای ایمیل ناموجود و گذرواژه غلط، تا حساب‌ها قابل شمارش نباشند
  const invalid = NextResponse.json(
    { error: { code: "invalid_credentials", message: "ایمیل یا گذرواژه درست نیست." } },
    { status: 401 },
  );

  if (!user || !user.isActive) return invalid;
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return invalid;

  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });

  return NextResponse.json({ ok: true, role: user.role });
}
