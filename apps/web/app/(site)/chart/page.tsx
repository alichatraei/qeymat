import type { Metadata } from "next";
import ChartExplorer from "@/components/market/ChartExplorer";
import { getSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نمودار و مقایسه‌ی قیمت تا ۱۰ سال",
  description:
    "نمودار روزانه، ماهانه و سالانه‌ی دلار، طلا، سکه، ارز و رمزارز تا ۱۰ سال گذشته، همراه با مقایسه‌ی بازدهی دارایی‌ها.",
  alternates: { canonical: "/chart" },
};

export default async function ChartPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; compare?: string; range?: string; interval?: string }>;
}) {
  const [snapshot, params] = await Promise.all([getSnapshot(), searchParams]);
  const symbols = new Set(snapshot.assets.map((asset) => asset.symbol));
  const requested = String(params.symbol || "USD").toUpperCase();
  const compare = String(params.compare || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => symbols.has(symbol) && symbol !== requested)
    .slice(0, 3);

  return (
    <ChartExplorer
      assets={snapshot.assets}
      initialSymbol={symbols.has(requested) ? requested : "USD"}
      initialCompare={compare}
      initialRange={params.range}
      initialInterval={params.interval}
    />
  );
}
