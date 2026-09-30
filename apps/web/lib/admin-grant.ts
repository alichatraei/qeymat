import "server-only";
import crypto from "node:crypto";
import { prisma } from "@qeymat/db";
import { activatePurchase } from "./activation";
import { verifyPassword } from "./auth";
import { findApiPlan, findPlusPlan } from "./pricing";
import { maskPhone } from "./otp";
import { sendOtpSms } from "./sms";
import type { SessionUser } from "./types";

/**
 * ارتقای دستی کاربر به پریمیوم از پنل مدیریت، با تأیید دو مرحله‌ای:
 *
 *   ۱. مدیر کاربر و پلن را انتخاب می‌کند؛ کد یک‌بارمصرف به موبایل خود مدیر
 *      فرستاده می‌شود (مدیری که موبایل ندارد، به‌جایش گذرواژه‌اش را وارد می‌کند).
 *   ۲. با کد درست، پلن فعال می‌شود.
 *
 * هش کد به «کاربر + نوع + پلن» گره خورده است؛ کد صادرشده برای یک ارتقا
 * نمی‌تواند ارتقای دیگری را تأیید کند. کد ۵ دقیقه اعتبار دارد و ۵ بار
 * اشتباه وارد شدن آن را باطل می‌کند.
 */
const TTL_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export type GrantKind = "PLUS_PLAN" | "API_PLAN";
export type GrantRequest = { userId: string; kind: GrantKind; planId: string };

const fingerprint = (request: GrantRequest) => `${request.userId}|${request.kind}|${request.planId}`;
const hash = (phone: string, code: string, request: GrantRequest) =>
  crypto.createHash("sha256").update(`grant:${phone}:${code}:${fingerprint(request)}`).digest("hex");

async function describe(request: GrantRequest) {
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { id: true, name: true, phone: true, email: true, isActive: true },
  });
  if (!user || !user.isActive) return { ok: false as const, message: "کاربر پیدا نشد یا غیرفعال است." };

  const plan = request.kind === "PLUS_PLAN" ? await findPlusPlan(request.planId) : await findApiPlan(request.planId);
  if (!plan) return { ok: false as const, message: "پلن پیدا نشد." };

  const label =
    request.kind === "PLUS_PLAN"
      ? `${"tier" in plan && plan.tier === "pro" ? "پلاس حرفه‌ای" : "قیمت پلاس"} ${plan.label}`
      : `وب‌سرویس ${plan.label}`;
  return { ok: true as const, user, label };
}

export async function startGrant(admin: SessionUser, request: GrantRequest) {
  const info = await describe(request);
  if (!info.ok) return info;

  if (!admin.phone) {
    const row = await prisma.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
    if (!row?.passwordHash) {
      return { ok: false as const, message: "برای تأیید دو مرحله‌ای، حساب مدیر باید موبایل یا گذرواژه داشته باشد." };
    }
    return { ok: true as const, method: "password" as const, label: info.label };
  }

  const recent = await prisma.otpCode.findFirst({
    where: { phone: admin.phone, purpose: "ADMIN_GRANT", createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) } },
  });
  if (recent) return { ok: false as const, message: "کد قبلی تازه فرستاده شده؛ یک دقیقه صبر کنید." };

  const code = String(crypto.randomInt(10000, 99999));
  await prisma.otpCode.create({
    data: {
      phone: admin.phone,
      purpose: "ADMIN_GRANT",
      codeHash: hash(admin.phone, code, request),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  const sent = await sendOtpSms(admin.phone, code);
  if (!sent.ok) return { ok: false as const, message: sent.error || "ارسال پیامک تأیید انجام نشد." };

  return { ok: true as const, method: "sms" as const, label: info.label, maskedPhone: maskPhone(admin.phone) };
}

export async function confirmGrant(admin: SessionUser, request: GrantRequest, secret: string) {
  const info = await describe(request);
  if (!info.ok) return info;
  const value = secret.trim();

  if (admin.phone) {
    const record = await prisma.otpCode.findFirst({
      where: { phone: admin.phone, purpose: "ADMIN_GRANT", consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!record) return { ok: false as const, message: "کد فعالی نیست؛ دوباره کد بگیرید." };
    if (record.attempts >= MAX_ATTEMPTS) return { ok: false as const, message: "تلاش‌های ناموفق زیاد بود؛ کد تازه بگیرید." };
    if (record.codeHash !== hash(admin.phone, value, request)) {
      await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      return { ok: false as const, message: "کد درست نیست." };
    }
    // مصرف اتمی: دو درخواست هم‌زمان با یک کد فقط یک ارتقا می‌سازند
    const claimed = await prisma.otpCode.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (!claimed.count) return { ok: false as const, message: "این کد قبلاً استفاده شده است." };
  } else {
    const row = await prisma.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
    if (!row?.passwordHash || !(await verifyPassword(value, row.passwordHash))) {
      return { ok: false as const, message: "گذرواژه درست نیست." };
    }
  }

  const result = await activatePurchase({
    userId: request.userId,
    kind: request.kind,
    planId: request.planId,
    reference: `admin:${admin.id}:${Date.now()}`,
  });
  if (!result.ok) return result;

  console.info(`[admin-grant] ${admin.id} → ${request.userId}: ${info.label}`);
  return { ok: true as const, label: info.label };
}
