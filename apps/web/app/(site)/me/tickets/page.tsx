import { redirect } from "next/navigation";

/** فهرست تیکت‌ها داخل خود پنل است؛ این مسیر فقط برای لینک‌های مستقیم می‌ماند. */
export default function TicketsIndex() {
  redirect("/me?tab=tickets");
}
