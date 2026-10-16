import type { Metadata } from "next";
import AlertsBoard from "@/components/market/AlertsBoard";
import { getSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "هشدار قیمت دلار و طلا — با اعلان و پیامک",
  description: "قیمت هدف بگذارید؛ وقتی رسید اعلان می‌گیرید و با قیمت پلاس پیامک هم می‌آید.",
  robots: { index: false },
  alternates: { canonical: "/alerts" },
};

export default async function AlertsPage() {
  const snapshot = await getSnapshot();
  return <AlertsBoard initialSnapshot={snapshot} />;
}
