import "server-only";
import crypto from "node:crypto";
import { prisma } from "@qeymat/db";
import { sendOtpSms } from "./sms";

const OTP_TTL_MS = 2 * 60 * 1000; // ۲ دقیقه
const RESEND_COOLDOWN_MS = 60 * 1000; // یک دقیقه بین دو درخواست
const MAX_ATTEMPTS = 5;

/**
 * نرمال‌سازی شماره موبایل ایران به فرم 09xxxxxxxxx.
 * ورودی‌های +98، 0098، 98 و ارقام فارسی/عربی را می‌پذیرد.
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;

  let value = String(input)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\s\-()]/g, "");

  if (value.startsWith("+98")) value = `0${value.slice(3)}`;
  else if (value.startsWith("0098")) value = `0${value.slice(4)}`;
  else if (value.startsWith("98") && value.length === 12) value = `0${value.slice(2)}`;
  else if (value.startsWith("9") && value.length === 10) value = `0${value}`;

  return /^09\d{9}$/.test(value) ? value : null;
}

/** شماره را برای نمایش می‌پوشاند: ۰۹۱۲***۴۵۶۷ */
export function maskPhone(phone: string) {
  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

function hashCode(phone: string, code: string) {
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

type IssueResult =
  | { ok: true; expiresInSec: number }
  | { ok: false; message: string; retryAfterSec?: number };

/** ساخت و ارسال کد ورود. کد خام هرگز ذخیره نمی‌شود. */
export async function issueOtp(phone: string, ip?: string | null): Promise<IssueResult> {
  const recent = await prisma.otpCode.findFirst({
    where: { phone, purpose: "LOGIN", createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    const waitMs = RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime());
    return {
      ok: false,
      message: "کد قبلی هنوز معتبر است. کمی صبر کنید.",
      retryAfterSec: Math.max(1, Math.ceil(waitMs / 1000)),
    };
  }

  // سقف روزانه برای جلوگیری از سوءاستفاده و هزینه‌ی پیامک
  const todayCount = await prisma.otpCode.count({
    where: { phone, purpose: "LOGIN", createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (todayCount >= 10) {
    return { ok: false, message: "تعداد درخواست کد برای امروز به سقف رسیده است." };
  }

  const code = String(crypto.randomInt(10000, 99999));

  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      ip: ip ?? null,
    },
  });

  const sent = await sendOtpSms(phone, code);
  if (!sent.ok) {
    return { ok: false, message: sent.error || "ارسال پیامک انجام نشد." };
  }

  return { ok: true, expiresInSec: OTP_TTL_MS / 1000 };
}

type VerifyResult =
  | { ok: true; userId: string; isNew: boolean }
  | { ok: false; message: string };

/** بررسی کد و ساخت کاربر در اولین ورود موفق. */
export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  // فقط کد ورود؛ کد تأیید مدیر (ADMIN_GRANT) نباید برای ورود پذیرفته شود
  const record = await prisma.otpCode.findFirst({
    where: { phone, purpose: "LOGIN", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, message: "کدی برای این شماره فعال نیست. دوباره درخواست دهید." };

  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, message: "تعداد تلاش‌های ناموفق زیاد است. کد تازه بگیرید." };
  }

  if (record.codeHash !== hashCode(phone, code.trim())) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, message: "کد وارد‌شده درست نیست." };
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    if (!existing.isActive) return { ok: false, message: "این حساب غیرفعال شده است." };
    await prisma.user.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), phoneVerifiedAt: new Date() },
    });
    return { ok: true, userId: existing.id, isNew: false };
  }

  const created = await prisma.user.create({
    data: {
      phone,
      name: `کاربر ${phone.slice(-4)}`,
      phoneVerifiedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });

  return { ok: true, userId: created.id, isNew: true };
}

/** آیا کاربر اشتراک قیمت پلاس فعال دارد؟ */
export async function hasPlusAccess(userId: string | null | undefined) {
  if (!userId) return false;
  const active = await prisma.plusSubscription.findFirst({
    where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return Boolean(active);
}
