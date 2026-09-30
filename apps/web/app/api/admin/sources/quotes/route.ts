import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { getMuted } from "@/lib/source-admin";

export const dynamic = "force-dynamic";

/** نقل‌قول‌های کهنه‌تر از این در خلاصه‌ی انحراف منابع حساب نمی‌شوند */
const RECENT_MS = 3 * 60 * 60 * 1000;

/**
 * آخرین عددی که هر منبع می‌خواند، کنار نرخ نهایی.
 *   ?symbol=USD  ← همه‌ی منابعِ یک دارایی
 *   بدون symbol  ← خلاصه‌ی هر منبع: تعداد نرخ، میانه و بیشترین انحراف
 */
export async function GET(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }
  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const [sources, muted] = await Promise.all([
    prisma.source.findMany({ select: { key: true, title: true, isActive: true } }),
    getMuted(),
  ]);
  const titleByKey = new Map(sources.map((source) => [source.key, source]));

  if (symbol) {
    const asset = await prisma.asset.findUnique({ where: { symbol }, include: { rate: true } });
    if (!asset) {
      return NextResponse.json({ error: { code: "not_found", message: "دارایی پیدا نشد." } }, { status: 404 });
    }
    const quotes = await prisma.sourceQuote.findMany({ where: { assetId: asset.id }, orderBy: { at: "desc" } });
    const final = asset.rate?.sell ?? null;
    return NextResponse.json({
      asset: { symbol: asset.symbol, nameFa: asset.nameFa, unit: asset.unit },
      rate: asset.rate
        ? {
            sell: asset.rate.sell,
            fetchedAt: asset.rate.fetchedAt,
            confidence: asset.rate.confidence,
            sourceCount: asset.rate.sourceCount,
          }
        : null,
      quotes: quotes.map((quote) => ({
        sourceKey: quote.sourceKey,
        title: titleByKey.get(quote.sourceKey)?.title ?? quote.sourceKey,
        sourceActive: titleByKey.get(quote.sourceKey)?.isActive ?? false,
        sell: quote.sell,
        buy: quote.buy,
        at: quote.at,
        deviation: final ? ((quote.sell - final) / final) * 100 : null,
        mutedSource: muted.sources.includes(quote.sourceKey),
        mutedPair: (muted.pairs[symbol] ?? []).includes(quote.sourceKey),
      })),
    });
  }

  // خلاصه: انحراف هر نقل‌قولِ تازه از نرخ نهایی همان دارایی
  const recent = await prisma.sourceQuote.findMany({
    where: { at: { gte: new Date(Date.now() - RECENT_MS) } },
    select: { sourceKey: true, sell: true, asset: { select: { symbol: true, rate: { select: { sell: true } } } } },
  });
  const bySource = new Map<string, { symbol: string; deviation: number }[]>();
  for (const quote of recent) {
    const final = quote.asset.rate?.sell;
    if (!final) continue;
    const list = bySource.get(quote.sourceKey) ?? [];
    list.push({ symbol: quote.asset.symbol, deviation: ((quote.sell - final) / final) * 100 });
    bySource.set(quote.sourceKey, list);
  }

  return NextResponse.json({
    muted,
    sources: [...bySource.entries()].map(([key, list]) => {
      const abs = list.map((item) => Math.abs(item.deviation)).sort((a, b) => a - b);
      const worst = [...list].sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)).slice(0, 3);
      return {
        key,
        recent: list.length,
        medianDeviation: abs[Math.floor(abs.length / 2)] ?? 0,
        worst,
      };
    }),
  });
}
