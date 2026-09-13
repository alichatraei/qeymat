import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { getRate, getSetting } from "@/lib/market";
import DashboardBoard from "@/components/dashboard/DashboardBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پنل توسعه‌دهنده", robots: { index: false } };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;

  const [subscription, apiKey, payments, usage, usdt, wallet, network] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
    }),
    prisma.apiKey.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.usageLog.groupBy({
      by: ["endpoint"],
      where: { apiKey: { userId: user.id }, at: { gte: new Date(Date.now() - 7 * 864e5) } },
      _count: { _all: true },
      _avg: { latencyMs: true },
    }),
    getRate("USDT"),
    getSetting<string>("payment.wallet", ""),
    getSetting<string>("payment.network", "BEP20"),
  ]);

  return (
    <DashboardBoard
      user={user}
      initialPlan={params.plan ?? subscription?.plan ?? "quarterly"}
      subscription={
        subscription
          ? {
              plan: subscription.plan,
              requestLimit: subscription.requestLimit,
              requestsUsed: subscription.requestsUsed,
              expiresAt: subscription.expiresAt.toISOString(),
            }
          : null
      }
      apiKeyPrefix={apiKey?.prefix ?? null}
      payments={payments.map((payment) => ({
        id: payment.id,
        plan: payment.plan,
        amountUsdt: payment.amountUsdt,
        txHash: payment.txHash,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
      }))}
      usage={usage.map((row) => ({
        endpoint: row.endpoint,
        count: row._count._all,
        avgLatency: Math.round(row._avg.latencyMs ?? 0),
      }))}
      usdtRate={usdt?.sell ?? 0}
      wallet={wallet}
      network={network}
    />
  );
}
