import Link from "next/link";
import Brand from "./Brand";

const COLUMNS = [
  {
    title: "بازار",
    links: [
      { href: "/", label: "نرخ ارز" },
      { href: "/?category=GOLD", label: "طلا و سکه" },
      { href: "/?category=CRYPTO", label: "رمزارز" },
      { href: "/converter", label: "مبدل تومان" },
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
      { href: "/panel", label: "پنل کاربری" },
      { href: "/panel/tickets", label: "پشتیبانی و تیکت" },
    ],
  },
  {
    title: "خدمات ارزی",
    links: [
      { href: "/ai", label: "اکانت هوش مصنوعی" },
      { href: "/ai#global-payment", label: "پرداخت ارزی" },
      { href: "/ai#gift-card", label: "گیفت‌کارت" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="content-width grid gap-10 py-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Brand />
          <p className="mt-4 max-w-[34ch] text-[12px] leading-6 text-muted">
            مرجع ساده و شفاف نرخ بازار ایران. ارز، طلا، سکه و رمزارز از منابع مشخص، با زمان دقیق
            به‌روزرسانی.
          </p>
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
      <div className="border-t border-line bg-[#fbfcfb]">
        <div className="content-width flex flex-wrap items-center gap-4 py-6">
          <a
            referrerPolicy="origin"
            target="_blank"
            rel="noopener noreferrer"
            href="https://trustseal.enamad.ir/?id=7477924&Code=yg52kGatBDdaUjsJpSGAbZDEPCLPetJ1"
            className="inline-flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-1.5"
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
          <p>تمام قیمت‌ها صرفاً جهت اطلاع‌رسانی هستند و مبنای معامله نیستند.</p>
          <p>
            طراحی و توسعه:{" "}
            <span className="font-semibold text-[#5c6971]">علی چترایی — تیم برنامه‌نویسی آ</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
