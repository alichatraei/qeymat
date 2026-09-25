import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getPlusStatus } from "@/lib/plus";
import PlusStore from "@/components/market/PlusStore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "قیمت پلاس — تحلیل قیمت و هشدار پیامکی",
  description:
    "تحلیل تکنیکال دلار، طلا، سکه و رمزارز، حباب سکه و هشدار قیمت با پیامک برای ۱۰ یا ۵۰ شاخص.",
  alternates: { canonical: "/plus" },
};

export default async function PlusPage() {
  const user = await getSessionUser();
  const plus = await getPlusStatus(user?.id);

  return (
    <PlusStore
      isLoggedIn={Boolean(user)}
      hasPlus={plus.active}
      expiresAt={plus.expiresAt}
      currentTier={plus.tier}
    />
  );
}
