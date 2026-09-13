import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, rateLimit, logUsage } from "@/lib/api-key";
import { getHistory } from "@/lib/market";

export const dynamic = "force-dynamic";

/** GET /api/v1/rates/USD/history?range=30 */
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
  const range = Math.min(365, Math.max(1, Number(request.nextUrl.searchParams.get("range")) || 7));
  const points = await getHistory(symbol, range);

  logUsage(check.apiKeyId, "/v1/rates/:symbol/history", 200, Date.now() - startedAt);

  return NextResponse.json({
    data: points.map((point) => ({ at: point.at, price: point.value })),
    meta: { symbol: symbol.toUpperCase(), range, count: points.length },
  });
}
