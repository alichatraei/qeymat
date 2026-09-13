import { NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { issueApiKey } from "@/lib/api-key";

/** صدور کلید تازه برای کاربر جاری. مقدار خام فقط همین یک بار برگردانده می‌شود. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "ابتدا وارد شوید." } }, { status: 401 });
  }

  const active = await prisma.subscription.findFirst({
    where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
  });
  if (!active) {
    return NextResponse.json(
      { error: { code: "no_active_plan", message: "برای صدور کلید، ابتدا یک پلن فعال تهیه کنید." } },
      { status: 403 },
    );
  }

  // کلیدهای قبلی غیرفعال می‌شوند تا همیشه یک کلید فعال در جریان باشد
  await prisma.apiKey.updateMany({ where: { userId: user.id, isActive: true }, data: { isActive: false } });
  const { rawKey } = await issueApiKey(user.id);

  return NextResponse.json({ ok: true, key: rawKey });
}
