import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

/** نرخ‌های سایت خودمان — بدون کلید، اما بدون تضمین پایداری برای مصرف بیرونی. */
export async function GET() {
  const snapshot = await getSnapshot();
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=45" },
  });
}
