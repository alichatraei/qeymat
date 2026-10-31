import { NextRequest, NextResponse } from "next/server";
import { getSeries } from "@/lib/market";
import { cacheGet, cacheSet } from "@/lib/redis";

export const dynamic = "force-dynamic";

const MAX_SYMBOLS = 24;
const POINTS = 32;

/** سری روزانه را به چند نقطهٔ سبک برای اسپارک‌لاین پس‌زمینهٔ کاشی‌ها کوچک می‌کند */
function downsample(values: number[]): number[] {
  if (values.length <= POINTS) return values;
  const out: number[] = [];
  for (let i = 0; i < POINTS; i += 1) {
    out.push(values[Math.round((i * (values.length - 1)) / (POINTS - 1))]);
  }
  return out;
}

/**
 * اسپارک‌لاین یک‌روزه برای چند نماد در یک درخواست — پس‌زمینهٔ کاشی‌های بنتو.
 * GET /api/public/sparks?symbols=USD,EMAMI,BTC
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("symbols") || "";
  const symbols = [...new Set(raw.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean))].slice(
    0,
    MAX_SYMBOLS,
  );
  if (!symbols.length) {
    return NextResponse.json({ error: { code: "invalid_query", message: "symbols لازم است." } }, { status: 400 });
  }

  const sparks: Record<string, number[]> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      const cacheKey = `qeymat:spark:${symbol}`;
      const cached = await cacheGet<number[]>(cacheKey);
      if (cached?.length) {
        sparks[symbol] = cached;
        return;
      }
      try {
        const series = await getSeries(symbol, "1d");
        const values = downsample((series?.points ?? []).map((point) => point.value));
        if (values.length >= 2) {
          sparks[symbol] = values;
          await cacheSet(cacheKey, values, 300);
        }
      } catch {
        /* نماد بدون تاریخچه؛ کاشی بدون نمودار می‌ماند */
      }
    }),
  );

  return NextResponse.json(
    { sparks },
    { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" } },
  );
}
