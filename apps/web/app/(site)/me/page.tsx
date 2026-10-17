import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import UserPanel from "@/components/dashboard/UserPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پنل کاربری", robots: { index: false } };

export default async function PanelPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/me");

  const [profile, plus, apiSub, orders, tickets, receipts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true, email: true, name: true, createdAt: true },
    }),
    prisma.plusSubscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
    }),
    prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
    }),
    prisma.gatewayOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: { lastReplyAt: "desc" },
      take: 20,
    }),
    prisma.receiptPayment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <UserPanel
      user={user}
      profile={{
        phone: profile?.phone ?? null,
        email: profile?.email ?? null,
        createdAt: profile?.createdAt.toISOString() ?? new Date().toISOString(),
      }}
      plus={
        plus
          ? { plan: plus.plan, startsAt: plus.startsAt.toISOString(), expiresAt: plus.expiresAt.toISOString() }
          : null
      }
      apiSub={
        apiSub
          ? {
              plan: apiSub.plan,
              requestLimit: apiSub.requestLimit,
              requestsUsed: apiSub.requestsUsed,
              expiresAt: apiSub.expiresAt.toISOString(),
            }
          : null
      }
      orders={orders.map((order) => ({
        id: order.id,
        kind: order.kind,
        plan: order.plan,
        amountRial: order.amountRial,
        status: order.status,
        refId: order.refId,
        createdAt: order.createdAt.toISOString(),
      }))}
      receipts={receipts.map((receipt) => ({
        id: receipt.id,
        kind: receipt.kind,
        plan: receipt.plan,
        amountToman: receipt.amountToman,
        status: receipt.status,
        adminNote: receipt.adminNote,
        createdAt: receipt.createdAt.toISOString(),
      }))}
      tickets={tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        lastReplyAt: ticket.lastReplyAt.toISOString(),
        createdAt: ticket.createdAt.toISOString(),
      }))}
    />
  );
}
