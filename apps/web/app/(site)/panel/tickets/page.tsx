import { permanentRedirect } from "next/navigation";

export default function PanelTicketsRedirect() {
  permanentRedirect("/me/tickets");
}
