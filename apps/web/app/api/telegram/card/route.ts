import { NextRequest, NextResponse } from "next/server";
import { getSeries, getSnapshot } from "@/lib/market";
import { rateLimit } from "@/lib/api-key";
import { conversionCard, priceCard } from "@/lib/telegram/card";
import { convert } from "@/lib/telegram/format";

export const dynamic = "force-dynamic";

/**
 * کش کوتاه در حافظه: تلگرام هر تصویر را چند بار می‌گیرد (کوچک و کامل، و در
 * inline برای هر نتیجه) و ساختن دوباره‌اش ثانیه‌ها طول می‌کشد. نشانی هر
 * دقیقه عوض می‌شود، پس یک دقیقه نگه داشتن کافی است.
 */
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; image: Buffer }>();

function remember(key: string, image: Buffer) {
  const now = Date.now();
  for (const [entry, value] of cache) if (now - value.at > CACHE_MS) cache.delete(entry);
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: now, image });
}

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
  const key = ["s", "a", "f", "t", "v"].map((name) => params.get(name) ?? "").join("|");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return send(hit.image);

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
    // نمودار دارایی غیرتومانی تبدیل (برای «تومان به دلار»، نمودار دلار)
    const unit = from === "IRT" || from === "IRR" ? to : from;
    const series = bySymbol.has(unit) ? await getSeries(unit, "1m").catch(() => null) : null;
    image = await conversionCard(conversion, bySymbol.get(unit), series?.points ?? []);
  }

  remember(key, image);
  return send(image);
}

function send(image: Buffer) {
  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      // اندازه‌ی کامل از اول معلوم است؛ بدون آن پاسخ تکه‌تکه (chunked) می‌رفت و
      // دانلود تلگرام گاهی نیمه‌کاره می‌ماند و پایین تصویر خاکستری می‌شد
      "Content-Length": String(image.length),
      // Cloudflare و تلگرام یک دقیقه نگه می‌دارند؛ نشانی هر دقیقه عوض می‌شود
      "Cache-Control": "public, max-age=60",
    },
  });
}
