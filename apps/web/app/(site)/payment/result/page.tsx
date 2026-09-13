import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "نتیجه پرداخت", robots: { index: false } };

const STATES: Record<
  string,
  { icon: typeof CheckCircle2; tone: string; title: string; note: string; href: string; cta: string }
> = {
  success: {
    icon: CheckCircle2,
    tone: "bg-green-soft text-green",
    title: "پرداخت با موفقیت انجام شد",
    note: "اشتراک شما فعال شد. جزئیات و تاریخ انقضا در پنل کاربری قابل مشاهده است.",
    href: "/panel",
    cta: "رفتن به پنل کاربری",
  },
  cancelled: {
    icon: AlertCircle,
    tone: "bg-[#fdf3e2] text-amber",
    title: "پرداخت لغو شد",
    note: "تراکنشی ثبت نشد و مبلغی از حساب شما کم نشده است.",
    href: "/plus",
    cta: "تلاش دوباره",
  },
  failed: {
    icon: XCircle,
    tone: "bg-[#fdeced] text-danger",
    title: "پرداخت ناموفق بود",
    note: "اگر مبلغ از حساب شما کم شده، طی ۷۲ ساعت به‌صورت خودکار برمی‌گردد.",
    href: "/panel/tickets",
    cta: "ثبت تیکت پشتیبانی",
  },
};

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ref?: string; message?: string }>;
}) {
  const params = await searchParams;
  const state = STATES[params.status ?? ""] ?? {
    icon: AlertCircle,
    tone: "bg-soft text-muted",
    title: "وضعیت پرداخت مشخص نیست",
    note: "اگر مبلغی از حساب شما کم شده است، با شماره پیگیری تیکت بزنید.",
    href: "/panel/tickets",
    cta: "ثبت تیکت",
  };

  return (
    <main className="content-width grid min-h-[65vh] place-items-center py-16">
      <div className="card w-full max-w-[440px] p-8 text-center shadow-card">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${state.tone}`}>
          <state.icon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-[21px] font-extrabold tracking-[-.6px]">{state.title}</h1>
        <p className="mt-3 text-[12.5px] leading-7 text-muted">{params.message || state.note}</p>

        {params.ref ? (
          <div className="mt-5 rounded-xl border border-line bg-[#fbfcfb] p-4">
            <span className="block text-2xs text-muted">شماره پیگیری</span>
            <code dir="ltr" className="mt-1 block font-mono text-[14px] font-bold">
              {params.ref}
            </code>
          </div>
        ) : null}

        <Link href={state.href} className="btn-solid mt-6 w-full">
          {state.cta}
        </Link>
        <Link href="/" className="btn-ghost mt-2 w-full">
          بازگشت به بازار
        </Link>
      </div>
    </main>
  );
}
