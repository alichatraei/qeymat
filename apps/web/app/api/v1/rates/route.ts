import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, rateLimit, logUsage } from "@/lib/api-key";
import { getSnapshot } from "@/lib/market";
import { hasPlusAccess } from "@/lib/otp";
import { CATEGORY_SLUGS } from "@qeymat/shared";

export const dynamic = "force-dynamic";

/** GET /api/v1/rates?category=currency */
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const rawKey = request.headers.get("x-api-key");

  const limit = await rateLimit(rawKey || request.headers.get("x-forwarded-for") || "anon");
  if (!limit.allowed) {
    return fail(429, "rate_limited", "تعداد درخواست‌ها در دقیقه بیش از حد مجاز است.");
  }

  const check = await verifyApiKey(rawKey);
  if (!check.ok) return fail(check.status, check.code, check.message);

  const snapshot = await getSnapshot();
  // مشترکان API هم برای دارایی‌های پلاس به اشتراک پلاس نیاز دارند
  const plus = await hasPlusAccess(check.userId);
  const category = request.nextUrl.searchParams.get("category");
  const mapped = category
    ? CATEGORY_SLUGS[category.toLowerCase() as keyof typeof CATEGORY_SLUGS]
    : null;

  const data = snapshot.assets
    .filter((asset) => (mapped ? asset.category === mapped : true))
    .filter((asset) => plus || asset.tier === "FREE")
    .map((asset) => ({
      symbol: asset.symbol,
      name_fa: asset.nameFa,
      name_en: asset.nameEn,
      category: asset.category.toLowerCase(),
      buy: asset.buy,
      sell: asset.sell,
      unit: asset.unit,
      change_24h: asset.changePercent,
      source: asset.sourceLabel,
      updated_at: asset.fetchedAt,
    }));

  logUsage(check.apiKeyId, "/v1/rates", 200, Date.now() - startedAt);

  return NextResponse.json(
    {
      data,
      meta: {
        count: data.length,
        updated_at: snapshot.updatedAt,
        plus_access: plus,
        ...(plus ? {} : { note: "دارایی‌های سطح پلاس نیاز به اشتراک قیمت پلاس دارند." }),
      },
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(limit.remaining),
        "X-Quota-Remaining": String(check.remaining),
      },
    },
  );
}

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
