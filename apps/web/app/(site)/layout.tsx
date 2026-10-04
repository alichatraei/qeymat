import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import BottomNav from "@/components/layout/BottomNav";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import AppPrompt from "@/components/pwa/AppPrompt";
import { getAppLinks, hasAppLinks } from "@/lib/app-links";
import { getSessionUser } from "@/lib/auth";
import { hasPlusAccess } from "@/lib/otp";

/** پوسته‌ی بخش عمومی سایت. پنل مدیریت چیدمان خودش را دارد. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const hasPlus = await hasPlusAccess(user?.id);
  const appLinks = await getAppLinks();
  const hasApp = hasAppLinks(appLinks);

  return (
    // پایین صفحه در موبایل به اندازه‌ی ناوبری شناور فاصله دارد تا فوتر زیرش نرود
    <div className="flex min-h-screen flex-col pb-[calc(76px+env(safe-area-inset-bottom))] xl:pb-0">
      <SiteHeader user={user} hasPlus={hasPlus} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <BottomNav user={user} />
      {/* روی اندروید، وقتی اپ منتشر شده، پیشنهاد اپ جای پیشنهاد نصب PWA را می‌گیرد */}
      <InstallPrompt skipAndroid={hasApp} />
      {hasApp ? <AppPrompt links={appLinks} /> : null}
    </div>
  );
}
