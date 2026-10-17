import Link from "next/link";
import Brand from "./Brand";

const COLUMNS = [
  {
    title: "بازار",
    links: [
      { href: "/", label: "قیمت دلار و ارز" },
      { href: "/?category=GOLD", label: "طلا و سکه" },
      { href: "/?category=CRYPTO", label: "رمزارز" },
      { href: "/chart", label: "نمودار ۱۰ ساله" },
      { href: "/converter", label: "تبدیل ارزها" },
      { href: "/widget", label: "ویجت گوشی" },
    ],
  },
  {
    title: "توسعه‌دهندگان",
    links: [
      { href: "/developers", label: "پلن‌های API" },
      { href: "/docs", label: "مستندات" },
      { href: "/dashboard", label: "پنل توسعه‌دهنده" },
    ],
  },
  {
    title: "اشتراک",
    links: [
      { href: "/plus", label: "قیمت پلاس" },
      { href: "/alerts", label: "هشدارهای قیمت" },
      { href: "/me", label: "پنل کاربری" },
      { href: "/me/tickets", label: "پشتیبانی و تیکت" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="content-width grid gap-10 py-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Brand />
          <p className="mt-4 max-w-[34ch] text-[12px] leading-6 text-muted">
            مرجع نرخ لحظه‌ای بازار ایران: دلار و ارز، طلا و سکه و رمزارز، با نمودار، تبدیل ارز و
            هشدار قیمت.
          </p>
          <a
            href="https://asapay.pro"
            target="_blank"
            rel="noopener"
            className="mt-4 inline-flex items-center gap-2 rounded-control border border-line bg-field px-3 py-2 text-[11px] font-semibold text-sub transition-colors hover:border-line-strong hover:text-ink"
          >
            خرید ارز، اکانت هوش مصنوعی و پرداخت ارزی در آساپی ←
          </a>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-[12px] font-bold text-ink">{column.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-[11.5px] text-muted transition-colors hover:text-green-dark">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* نمادها */}
      <div className="border-t border-line bg-field">
        <div className="content-width flex flex-wrap items-center gap-4 py-6">
          <a
            referrerPolicy="origin"
            target="_blank"
            rel="noopener noreferrer"
            href="https://trustseal.enamad.ir/?id=7477924&Code=yg52kGatBDdaUjsJpSGAbZDEPCLPetJ1"
            className="inline-flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-1.5"
            aria-label="نماد اعتماد الکترونیکی"
          >
            {/*
              اسکریپت اینماد اجباری است که تگ img با همان code باشد،
              بنابراین از next/image استفاده نمی‌کنیم و تگ خام می‌ماند.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              referrerPolicy="origin"
              src="https://trustseal.enamad.ir/logo.aspx?id=7477924&Code=yg52kGatBDdaUjsJpSGAbZDEPCLPetJ1"
              alt="نماد اعتماد الکترونیکی"
              style={{ cursor: "pointer" }}
              {...{ code: "yg52kGatBDdaUjsJpSGAbZDEPCLPetJ1" }}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </a>

          <p className="max-w-[46ch] text-[11px] leading-6 text-muted">
            قیمت دارای نماد اعتماد الکترونیکی است. پرداخت‌ها از درگاه امن زرین‌پال انجام می‌شود و
            اطلاعات کارت شما هرگز روی این سایت ذخیره نمی‌شود.
          </p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="content-width flex flex-col gap-3 py-5 text-[10.5px] text-muted md:flex-row md:items-center md:justify-between">
          <p>
            تمام قیمت‌ها صرفاً جهت اطلاع‌رسانی هستند و مبنای معامله نیستند. ·{" "}
            <Link href="/privacy" className="font-semibold text-sub hover:text-green-dark">
              حریم خصوصی
            </Link>
          </p>
          <p>
            طراحی و توسعه:{" "}
            <span className="font-semibold text-sub">علی چترایی — تیم برنامه‌نویسی آ</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
