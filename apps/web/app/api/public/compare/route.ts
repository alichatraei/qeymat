import { NextRequest, NextResponse } from "next/server";
import { getSeries } from "@/lib/market";

export const dynamic = "force-dynamic";

/**
 * مقایسه‌ی چند دارایی در یک بازه.
 *   ?symbols=USD,EUR,GOLD18&range=5y&interval=month
 * برای هر دارایی سری جداگانه برمی‌گردد؛ نرمال‌سازی (درصد تغییر از ابتدای
 * بازه) سمت کاربر انجام می‌شود تا جابه‌جایی بین حالت مطلق و درصدی سریع باشد.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbols = [
    ...new Set(
      (params.get("symbols") || "")
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ].slice(0, 4);

  if (!symbols.length) {
    return NextResponse.json(
      { error: { code: "invalid_query", message: "دست‌کم یک نماد لازم است." } },
      { status: 400 },
    );
  }

  const series = await Promise.all(
    symbols.map((symbol) => getSeries(symbol, params.get("range") || "1y", params.get("interval"))),
  );

  return NextResponse.json(
    { series: series.filter(Boolean) },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=180" } },
  );
}
