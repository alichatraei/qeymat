import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, rateLimit, logUsage } from "@/lib/api-key";
import { getSeries } from "@/lib/market";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/rates/USD/history?range=1y&interval=month
 * range: 1d | 1w | 1m | 3m | 1y | 3y | 5y | 10y (یا عدد روز، برای سازگاری)
 * interval: day | month | year
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const startedAt = Date.now();
  const rawKey = request.headers.get("x-api-key");

  const limit = await rateLimit(rawKey || "anon");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "تعداد درخواست‌ها بیش از حد مجاز است." } },
      { status: 429 },
    );
  }

  const check = await verifyApiKey(rawKey);
  if (!check.ok) {
    return NextResponse.json({ error: { code: check.code, message: check.message } }, { status: check.status });
  }

  const { symbol } = await params;
  const rawRange = request.nextUrl.searchParams.get("range") || "1m";
  const days = Number(rawRange);
  const range = Number.isFinite(days)
    ? days <= 1 ? "1d" : days <= 7 ? "1w" : days <= 31 ? "1m" : days <= 92 ? "3m" : days <= 366 ? "1y"
      : days <= 3 * 366 ? "3y" : days <= 5 * 366 ? "5y" : "10y"
    : rawRange;
  const series = await getSeries(symbol, range, request.nextUrl.searchParams.get("interval"));

  if (!series) {
    logUsage(check.apiKeyId, "/v1/rates/:symbol/history", 404, Date.now() - startedAt);
    return NextResponse.json(
      { error: { code: "not_found", message: "نماد درخواستی پیدا نشد." } },
      { status: 404 },
    );
  }

  logUsage(check.apiKeyId, "/v1/rates/:symbol/history", 200, Date.now() - startedAt);

  return NextResponse.json({
    data: series.points.map((point) => ({
      at: point.at,
      price: point.value,
      open: point.open ?? null,
      high: point.high ?? null,
      low: point.low ?? null,
    })),
    meta: {
      symbol: series.symbol,
      range: series.range,
      interval: series.interval,
      first_day: series.firstDay,
      years_available: series.yearsAvailable,
      count: series.points.length,
    },
  });
}
