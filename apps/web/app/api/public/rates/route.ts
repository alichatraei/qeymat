import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/market";
import { getSessionUser } from "@/lib/auth";
import { hasPlusAccess } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * نرخ‌های سایت خودمان. همه‌ی قیمت‌ها برای همه قابل مشاهده است؛
 * hasPlus فقط برای نمایش بخش تحلیل و هشدار پیامکی برگردانده می‌شود.
 */
export async function GET() {
  const user = await getSessionUser();
  const plus = await hasPlusAccess(user?.id);

  const snapshot = await getSnapshot();

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
