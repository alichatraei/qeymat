import { permanentRedirect } from "next/navigation";

export default async function PanelTicketRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/me/tickets/${id}`);
}
