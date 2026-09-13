import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "اتصال برقرار نیست", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main className="content-width grid min-h-[60vh] place-items-center py-20 text-center">
      <div className="max-w-[40ch]">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-green-soft text-green">
          <WifiOff className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-[22px] font-extrabold">اتصال اینترنت برقرار نیست</h1>
        <p className="mt-3 text-[13px] leading-7 text-muted">
          آخرین نرخ‌هایی که دیده‌اید همچنان در دسترس است. برای دریافت قیمت تازه، اتصال را بررسی کنید.
        </p>
        <Link href="/" className="btn-solid mt-6">
          تلاش دوباره
        </Link>
      </div>
    </main>
  );
}
