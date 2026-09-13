import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "USD";
  const range = Math.min(365, Math.max(1, Number(request.nextUrl.searchParams.get("range")) || 7));

  const data = await getHistory(symbol, range);
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=180" } },
  );
}
