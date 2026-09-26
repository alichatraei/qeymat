import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@qeymat/db";
import type { SessionUser } from "./types";

const COOKIE_NAME = "qeymat_session";
/** هر ورود ۳۰ روز روی همان دستگاه می‌ماند */
const MAX_AGE = 60 * 60 * 24 * 30; // ۳۰ روز

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET باید حداقل ۳۲ کاراکتر باشد");
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * نشست می‌سازد: کوکی برای مرورگر، و همان توکن برای اپ‌های نیتیو
 * (اپ اندروید آن را در هدر Authorization: Bearer می‌فرستد).
 */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    phone: user.phone,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return token;
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

/** توکن نشست: کوکی مرورگر یا هدر Authorization اپ موبایل */
async function sessionToken() {
  const bearer = (await headers()).get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) return bearer.slice(7).trim();
  return (await cookies()).get(COOKIE_NAME)?.value;
}

/** کاربر جاری یا null — بدون پرتاب خطا */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await sessionToken();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;

    // نقش را از دیتابیس می‌خوانیم تا تغییر دسترسی فوراً اعمال شود.
    // کاربر عادی فقط شماره موبایل دارد و ایمیل ندارد — نسخه‌ی قبل همین‌جا
    // نشست کاربران موبایلی را باطل می‌کرد و ورود هرگز ماندگار نمی‌شد.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, phone: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
}

/** برای صفحات محافظت‌شده — در صورت نبود کاربر خطا می‌دهد */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
