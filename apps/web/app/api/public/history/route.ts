import { NextRequest, NextResponse } from "next/server";
import { getSeries } from "@/lib/market";

export const dynamic = "force-dynamic";

/**
 * سری قیمت برای نمودار.
 *   ?symbol=USD&range=1d|1w|1m|3m|1y|3y|5y|10y&interval=day|month|year
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const series = await getSeries(
    params.get("symbol") || "USD",
    params.get("range") || "1m",
    params.get("interval"),
  );

  if (!series) {
    return NextResponse.json({ error: { code: "not_found", message: "دارایی پیدا نشد." } }, { status: 404 });
  }

  return NextResponse.json(
    { data: series.points, series },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=180" } },
  );
}
