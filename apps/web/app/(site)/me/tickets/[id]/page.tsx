import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import TicketThread from "@/components/dashboard/TicketThread";

type MessageRow = {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: Date;
};

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "گفت‌وگوی تیکت", robots: { index: false } };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/me");

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket || (ticket.userId !== user.id && user.role !== "ADMIN")) notFound();

  return (
    <TicketThread
      isStaff={user.role === "ADMIN"}
      ticket={{
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
      }}
      messages={ticket.messages.map((message: MessageRow) => ({
        id: message.id,
        body: message.body,
        fromStaff: message.fromStaff,
        createdAt: message.createdAt.toISOString(),
      }))}
    />
  );
}
