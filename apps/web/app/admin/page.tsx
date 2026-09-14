import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import AdminBoard from "@/components/admin/AdminBoard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = (await getSessionUser())!;

  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    userCount,
    activeSubs,
    pending,
    todayUsage,
    payments,
    sources,
    orders,
    users,
    subscribers,
    plusCount,
    openTickets,
    gatewayOrders,
    tickets,
    revenue,
  ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.usageLog.count({ where: { at: { gte: startOfDay } } }),
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
        select: {
          id: true, name: true, email: true, phone: true,
          role: true, createdAt: true, lastSeenAt: true,
        },
      }),
      prisma.pushSubscription.count(),
      prisma.plusSubscription.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
      prisma.ticket.count({ where: { status: { not: "CLOSED" } } }),
      prisma.gatewayOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { user: { select: { name: true, phone: true, email: true } } },
      }),
      prisma.ticket.findMany({
        orderBy: { lastReplyAt: "desc" },
        take: 30,
        include: { user: { select: { name: true, phone: true } } },
      }),
      // درآمد ماه جاری، فقط تراکنش‌های واقعاً پرداخت‌شده
      prisma.gatewayOrder.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfMonth } },
        _sum: { amountRial: true },
      }),
    ]);

  return (
    <AdminBoard
      admin={user}
      stats={{
        userCount,
        activeSubs,
        pending,
        todayUsage,
        subscribers,
        plusCount,
        openTickets,
        monthRevenueToman: Math.round((revenue._sum.amountRial ?? 0) / 10),
      }}
      gatewayOrders={gatewayOrders.map((order) => ({
        id: order.id,
        user: order.user.name,
        contact: order.user.phone ?? order.user.email ?? "—",
        kind: order.kind,
        plan: order.plan,
        amountToman: Math.round(order.amountRial / 10),
        status: order.status,
        refId: order.refId,
        failReason: order.failReason,
        createdAt: order.createdAt.toISOString(),
      }))}
      tickets={tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        user: ticket.user.name,
        contact: ticket.user.phone ?? "—",
        lastReplyAt: ticket.lastReplyAt.toISOString(),
        createdAt: ticket.createdAt.toISOString(),
      }))}
      payments={payments.map((payment) => ({
        id: payment.id,
        user: payment.user.name,
        email: payment.user.email ?? "—",
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
        email: item.email ?? null,
        phone: item.phone ?? null,
        role: item.role,
        createdAt: item.createdAt.toISOString(),
        lastSeenAt: item.lastSeenAt?.toISOString() ?? null,
      }))}
    />
  );
}
