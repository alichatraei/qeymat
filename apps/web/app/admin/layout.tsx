import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "پنل مدیریت", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return <div className="min-h-screen bg-page">{children}</div>;
}
