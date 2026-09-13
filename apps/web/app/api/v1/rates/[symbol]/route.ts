import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, rateLimit, logUsage } from "@/lib/api-key";
import { getRate } from "@/lib/market";
import { hasPlusAccess } from "@/lib/otp";

export const dynamic = "force-dynamic";

/** GET /api/v1/rates/USD */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const startedAt = Date.now();
  const rawKey = request.headers.get("x-api-key");

  const limit = await rateLimit(rawKey || request.headers.get("x-forwarded-for") || "anon");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "تعداد درخواست‌ها در دقیقه بیش از حد مجاز است." } },
      { status: 429 },
    );
  }

  const check = await verifyApiKey(rawKey);
  if (!check.ok) {
    return NextResponse.json({ error: { code: check.code, message: check.message } }, { status: check.status });
  }

  const { symbol } = await params;
  const rate = await getRate(symbol);
  if (!rate) {
    logUsage(check.apiKeyId, "/v1/rates/:symbol", 404, Date.now() - startedAt);
    return NextResponse.json(
      { error: { code: "not_found", message: "نماد درخواستی پیدا نشد." } },
      { status: 404 },
    );
  }

  if (rate.tier === "PLUS" && !(await hasPlusAccess(check.userId))) {
    logUsage(check.apiKeyId, "/v1/rates/:symbol", 403, Date.now() - startedAt);
    return NextResponse.json(
      {
        error: {
          code: "plus_required",
          message: "دسترسی به این دارایی نیاز به اشتراک قیمت پلاس دارد.",
        },
      },
      { status: 403 },
    );
  }

  logUsage(check.apiKeyId, "/v1/rates/:symbol", 200, Date.now() - startedAt);

  return NextResponse.json(
    {
      data: {
        symbol: rate.symbol,
        name_fa: rate.nameFa,
        name_en: rate.nameEn,
        category: rate.category.toLowerCase(),
        buy: rate.buy,
        sell: rate.sell,
        price: rate.sell,
        unit: rate.unit,
        change_24h: rate.changePercent,
        day_low: rate.dayLow,
        day_high: rate.dayHigh,
        global_price: rate.globalPrice,
        source: rate.sourceLabel,
        updated_at: rate.fetchedAt,
      },
    },
    { headers: { "X-Quota-Remaining": String(check.remaining) } },
  );
}
