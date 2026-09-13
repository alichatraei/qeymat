import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, rateLimit, logUsage } from "@/lib/api-key";
import { getRate } from "@/lib/market";

export const dynamic = "force-dynamic";

/** GET /api/v1/convert?from=USD&amount=250 */
export async function GET(request: NextRequest) {
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

  const from = (request.nextUrl.searchParams.get("from") || "USD").toUpperCase();
  const amount = Number(request.nextUrl.searchParams.get("amount") || 1);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: { code: "invalid_amount", message: "پارامتر amount باید عددی مثبت باشد." } },
      { status: 400 },
    );
  }

  const rate = await getRate(from);
  if (!rate) {
    return NextResponse.json({ error: { code: "not_found", message: "نماد مبدأ پیدا نشد." } }, { status: 404 });
  }

  logUsage(check.apiKeyId, "/v1/convert", 200, Date.now() - startedAt);

  return NextResponse.json({
    data: {
      from: rate.symbol,
      to: "TOMAN",
      amount,
      rate: rate.sell,
      result: Math.round(amount * rate.sell),
      updated_at: rate.fetchedAt,
    },
  });
}
