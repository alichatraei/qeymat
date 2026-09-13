import type { Metadata } from "next";
import ConverterBoard from "@/components/market/ConverterBoard";
import { getSnapshot, maskSnapshot } from "@/lib/market";
import { getSessionUser } from "@/lib/auth";
import { hasPlusAccess } from "@/lib/otp";

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
  const [raw, params] = await Promise.all([getSnapshot(), searchParams]);
  const user = await getSessionUser();
  // مبدل هم فقط دارایی‌های در دسترس کاربر را نشان می‌دهد
  const snapshot = {
    ...raw,
    assets: maskSnapshot(raw, await hasPlusAccess(user?.id)).assets.filter((asset) => !asset.locked),
  };
  const requested = String(params.symbol || "USD").toUpperCase();
  const exists = snapshot.assets.some((asset) => asset.symbol === requested);

  return <ConverterBoard initialSnapshot={snapshot} initialSymbol={exists ? requested : "USD"} />;
}
