import { NextRequest, NextResponse } from "next/server";
import { issueOtp, maskPhone, normalizePhone } from "@/lib/otp";
import { rateLimit } from "@/lib/api-key";

export const dynamic = "force-dynamic";

/** ارسال کد ورود به شماره‌ی موبایل. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";

  // سقف روی آی‌پی، جدا از سقف روی شماره که داخل issueOtp اعمال می‌شود
  const limit = await rateLimit(`otp-send:${ip}`, 12, 600);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "درخواست‌های زیادی از این دستگاه ارسال شده است." } },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const phone = normalizePhone(body?.phone);
  if (!phone) {
    return NextResponse.json(
      { error: { code: "invalid_phone", message: "شماره موبایل معتبر نیست." } },
      { status: 400 },
    );
  }

  const result = await issueOtp(phone, ip);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "otp_failed", message: result.message }, retryAfterSec: result.retryAfterSec },
      { status: result.retryAfterSec ? 429 : 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    phone: maskPhone(phone),
    expiresInSec: result.expiresInSec,
  });
}
