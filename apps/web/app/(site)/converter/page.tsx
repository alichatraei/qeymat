import type { Metadata } from "next";
import ConverterBoard from "@/components/market/ConverterBoard";
import { getSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مبدل ارز به تومان",
  description: "تبدیل دلار، یورو، درهم، طلا و رمزارز به تومان با نرخ لحظه‌ای بازار.",
  alternates: { canonical: "/converter" },
};

export default async function ConverterPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const [snapshot, params] = await Promise.all([getSnapshot(), searchParams]);
  const requested = String(params.symbol || "USD").toUpperCase();
  const exists = snapshot.assets.some((asset) => asset.symbol === requested);

  return <ConverterBoard initialSnapshot={snapshot} initialSymbol={exists ? requested : "USD"} />;
}
