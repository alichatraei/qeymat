import { NextRequest, NextResponse } from "next/server";
import { getSeries, getSnapshot } from "@/lib/market";
import { rateLimit } from "@/lib/api-key";
import { conversionCard, priceCard } from "@/lib/telegram/card";
import { convert } from "@/lib/telegram/format";

export const dynamic = "force-dynamic";

/**
 * تصویر قیمت (?s=USD) یا تبدیل (?a=10&f=USD&t=IRT) برای ربات تلگرام.
 * تلگرام خودش این نشانی را دانلود می‌کند؛ JPEG چون نتیجه‌ی inline فقط JPEG می‌پذیرد.
 */
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = await rateLimit(`tgcard:${ip}`, 120, 60);
  if (!limit.allowed) return new NextResponse("Too many requests", { status: 429 });

  const params = request.nextUrl.searchParams;
  const snapshot = await getSnapshot();
  const bySymbol = new Map(snapshot.assets.map((asset) => [asset.symbol, asset]));

  let image: Buffer | null = null;
  const symbol = params.get("s")?.toUpperCase();
  if (symbol) {
    const rate = bySymbol.get(symbol);
    if (!rate) return new NextResponse("Not found", { status: 404 });
    const series = await getSeries(symbol, "1m").catch(() => null);
    image = await priceCard(rate, series?.points ?? []);
  } else {
    const amount = Number(params.get("a"));
    const from = params.get("f")?.toUpperCase() ?? "";
    const to = params.get("t")?.toUpperCase() ?? "";
    const conversion = amount > 0 ? convert(amount, from, to, bySymbol) : null;
    if (!conversion) return new NextResponse("Bad request", { status: 400 });
    const unit = from === "IRT" || from === "IRR" ? to : from;
    image = await conversionCard(conversion, bySymbol.get(unit));
  }

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      // Cloudflare و تلگرام یک دقیقه نگه می‌دارند؛ نشانی هر دقیقه عوض می‌شود
      "Cache-Control": "public, max-age=60",
    },
  });
}
