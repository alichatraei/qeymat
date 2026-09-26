import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { normalizePhone, verifyOtp } from "@/lib/otp";
import { createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/api-key";

export const dynamic = "force-dynamic";

/** بررسی کد و ساخت نشست. کاربر تازه در همین مرحله ساخته می‌شود. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  const limit = await rateLimit(`otp-verify:${ip}`, 20, 600);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "تلاش‌های زیادی انجام شده است.",
        },
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const phone = normalizePhone(body?.phone);
  const code = String(body?.code ?? "").trim();

  if (!phone || !/^\d{4,6}$/.test(code)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_body",
          message: "شماره یا کد وارد‌شده درست نیست.",
        },
      },
      { status: 400 },
    );
  }

  const result = await verifyOtp(phone, code);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "otp_invalid", message: result.message } },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user) {
    return NextResponse.json(
      { error: { code: "user_not_found", message: "کاربر پیدا نشد." } },
      { status: 404 },
    );
  }

  const token = await createSession({
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
  });

  // اپ نیتیو کوکی نگه نمی‌دارد و توکن را خودش ذخیره می‌کند
  const native = request.headers.get("x-qeymat-client");
  return NextResponse.json({
    ok: true,
    isNew: result.isNew,
    role: user.role,
    ...(native ? { token, phone: user.phone, expiresInDays: 30 } : {}),
  });
}
