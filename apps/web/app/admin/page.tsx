import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import AdminBoard from "@/components/admin/AdminBoard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = (await getSessionUser())!;

  const [userCount, activeSubs, pending, todayUsage, payments, sources, orders, users, subscribers] =
    await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.usageLog.count({ where: { at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.source.findMany({ orderBy: { key: "asc" } }),
      prisma.aiOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { product: { select: { title: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, name: true, email: true, role: true, createdAt: true, lastSeenAt: true },
      }),
      prisma.pushSubscription.count(),
    ]);

  return (
    <AdminBoard
      admin={user}
      stats={{ userCount, activeSubs, pending, todayUsage, subscribers }}
      payments={payments.map((payment) => ({
        id: payment.id,
        user: payment.user.name,
        email: payment.user.email,
        plan: payment.plan,
        amountUsdt: payment.amountUsdt,
        txHash: payment.txHash,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
      }))}
      sources={sources.map((source) => ({
        key: source.key,
        title: source.title,
        adapter: source.adapter,
        status: source.status,
        isActive: source.isActive,
        intervalSec: source.intervalSec,
        lastFetchedAt: source.lastFetchedAt?.toISOString() ?? null,
        lastLatencyMs: source.lastLatencyMs,
        lastError: source.lastError,
      }))}
      orders={orders.map((order) => ({
        id: order.id,
        product: order.product.title,
        fullName: order.fullName,
        contact: order.contact,
        note: order.note,
        amountToma: order.amountToma,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      }))}
      users={users.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        role: item.role,
        createdAt: item.createdAt.toISOString(),
        lastSeenAt: item.lastSeenAt?.toISOString() ?? null,
      }))}
    />
  );
}
