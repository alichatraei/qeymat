import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** جست‌وجوی کاربر با موبایل، نام یا ایمیل؛ همراه اشتراک‌های فعال */
export async function GET(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }

  const raw = (request.nextUrl.searchParams.get("q") || "").trim();
  // ارقام فارسی و فاصله‌ی شماره‌ها
  const q = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\s+/g, "");
  const now = new Date();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: raw, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastSeenAt: true,
      plusSubscriptions: {
        where: { status: "ACTIVE", expiresAt: { gt: now } },
        orderBy: { expiresAt: "desc" },
        take: 1,
        select: { plan: true, expiresAt: true },
      },
      subscriptions: {
        where: { status: "ACTIVE", expiresAt: { gt: now } },
        orderBy: { expiresAt: "desc" },
        take: 1,
        select: { plan: true, expiresAt: true },
      },
    },
  });

  return NextResponse.json({
    users: users.map(({ plusSubscriptions, subscriptions, ...user }) => ({
      ...user,
      plus: plusSubscriptions[0] ?? null,
      api: subscriptions[0] ?? null,
    })),
  });
}
