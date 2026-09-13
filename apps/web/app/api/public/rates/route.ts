import { NextResponse } from "next/server";
import { getSnapshot, maskSnapshot } from "@/lib/market";
import { getSessionUser } from "@/lib/auth";
import { hasPlusAccess } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * نرخ‌های سایت خودمان.
 * دارایی‌های سطح PLUS برای کاربر بدون اشتراک پوشانده می‌شوند —
 * ردیف می‌ماند ولی عدد صفر است، تا کاربر بداند چه چیزی را نمی‌بیند.
 */
export async function GET() {
  const user = await getSessionUser();
  const plus = await hasPlusAccess(user?.id);

  const snapshot = maskSnapshot(await getSnapshot(), plus);

  return NextResponse.json(
    { ...snapshot, hasPlus: plus },
    {
      headers: {
        // پاسخ به کاربر بستگی دارد، پس نباید در CDN مشترک کش شود
        "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
      },
    },
  );
}
