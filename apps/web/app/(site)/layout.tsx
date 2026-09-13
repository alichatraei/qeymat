import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { getSessionUser } from "@/lib/auth";

/** پوسته‌ی بخش عمومی سایت. پنل مدیریت چیدمان خودش را دارد. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <InstallPrompt />
    </div>
  );
}
