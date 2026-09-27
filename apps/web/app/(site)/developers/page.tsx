import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Code2, Globe, Lock, Rocket, Zap } from "lucide-react";
import PlanPicker from "@/components/market/PlanPicker";
import { getRate } from "@/lib/market";
import { getCheckoutData } from "@/lib/pricing";
import { getSessionUser } from "@/lib/auth";
import { fa } from "@qeymat/shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "API نرخ ارز، طلا و رمزارز",
  description:
    "API ساده و سریع نرخ بازار ایران برای توسعه‌دهندگان؛ ارز، طلا، سکه و رمزارز با پاسخ JSON، تاریخچه‌ی ۱۰ ساله و پرداخت ریالی.",
  alternates: { canonical: "/developers" },
};

const BENEFITS = [
  { icon: Globe, title: "ارز، طلا و کریپتو", note: "در یک API واحد" },
  { icon: Clock, title: "داده تازه بازار", note: "با زمان دقیق به‌روزرسانی" },
  { icon: Lock, title: "کلید اختصاصی", note: "مدیریت مصرف و دسترسی" },
  { icon: Code2, title: "REST و JSON", note: "ساده برای هر پلتفرم" },
];

export default async function DevelopersPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const [checkout, user] = await Promise.all([getCheckoutData(), getSessionUser()]);
  const usd = await getRate("USD");

  return (
    <main className="pb-20 pt-12">
      <section className="content-width grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.85fr)] lg:items-center">
        <div className="max-w-[52ch]">
          <span className="text-[11.5px] font-bold text-green-dark">Qeymat API</span>
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.25] tracking-[-1.2px]">
            نرخ بازار ایران، آماده برای محصول شما
          </h1>
          <p className="mt-4 text-[13px] leading-7 text-muted">
            یک API ساده برای ارز، طلا، سکه و رمزارز؛ با پاسخ استاندارد، تاریخچه قیمت و تبدیل به تومان.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-solid">
              <Rocket />
              شروع استفاده
            </Link>
            <Link href="/docs" className="btn-ghost">
              مشاهده مستندات
            </Link>
          </div>
        </div>

        <div dir="ltr" className="card overflow-hidden shadow-card">
          <div className="flex items-center gap-3 border-b border-line bg-field px-4 py-3">
            <span className="flex gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-danger/30" />
              <i className="h-2.5 w-2.5 rounded-full bg-amber-line" />
              <i className="h-2.5 w-2.5 rounded-full bg-green/25" />
            </span>
            <code className="font-mono text-[11px] text-muted">api.qeymat.online</code>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[11.5px] leading-6 text-sub">{`GET /v1/rates/USD

{
  "symbol": "USD",
  "price": ${usd ? Math.round(usd.sell) : 231100},
  "unit": "TOMAN",
  "change_24h": ${usd ? usd.changePercent : -1.2},
  "updated_at": "${usd ? usd.fetchedAt : new Date().toISOString()}"
}`}</pre>
          <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-[11px] text-green-dark">
            <Zap className="h-4 w-4" />
            میانگین پاسخ زیر ۱۰۰ میلی‌ثانیه
          </div>
        </div>
      </section>

      <section className="mt-14 border-y border-line bg-field py-7">
        <div className="content-width grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-green shadow-[0_0_0_1px_rgba(7,19,31,.06)]">
                <benefit.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex flex-col">
                <b className="text-[12.5px]">{benefit.title}</b>
                <small className="text-[11px] text-muted">{benefit.note}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-width pt-14">
        <div className="mx-auto max-w-[46ch] text-center">
          <span className="text-[11.5px] font-bold text-green-dark">پرداخت ریالی</span>
          <h2 className="mt-2 text-[26px] font-extrabold tracking-[-.8px]">
            پلنی متناسب با رشد محصولتان
          </h2>
          <p className="mt-3 text-[12.5px] leading-6 text-muted">
            با درگاه آنلاین یا کارت‌به‌کارت پرداخت کنید. تمدید، زمان باقی‌مانده‌ی اشتراک فعلی را حفظ
            می‌کند و کلید API شما عوض نمی‌شود.
          </p>
        </div>

        <PlanPicker checkout={checkout} isLoggedIn={Boolean(user)} initialPlan={plan} />
      </section>
    </main>
  );
}
