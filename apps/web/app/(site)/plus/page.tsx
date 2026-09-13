import type { Metadata } from "next";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { hasPlusAccess } from "@/lib/otp";
import PlusStore from "@/components/market/PlusStore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "قیمت پلاس — نفت، سهام جهانی و شاخص‌ها",
  description:
    "با قیمت پلاس به نرخ نفت برنت و WTI، طلا و نقره جهانی، سهام اپل و تسلا و انویدیا و شاخص‌های S&P 500 و نزدک دسترسی بگیرید.",
  alternates: { canonical: "/plus" },
};

export default async function PlusPage() {
  const user = await getSessionUser();
  const plus = await hasPlusAccess(user?.id);

  const [premiumAssets, current] = await Promise.all([
    prisma.asset.findMany({
      where: { tier: "PLUS", isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: { symbol: true, nameFa: true, category: true, mark: true, countryCode: true },
    }),
    user
      ? prisma.plusSubscription.findFirst({
          where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "desc" },
        })
      : null,
  ]);

  return (
    <PlusStore
      isLoggedIn={Boolean(user)}
      hasPlus={plus}
      expiresAt={current?.expiresAt.toISOString() ?? null}
      assets={premiumAssets}
    />
  );
}
