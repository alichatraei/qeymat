"use client";

import { useState } from "react";
import { Check, ChevronLeft, Copy, FileText, Lock, Repeat, Rocket } from "lucide-react";

type Topic = {
  id: string;
  label: string;
  icon: typeof Rocket;
  group: string;
  title: string;
  intro: string;
  sections: { heading: string; body?: string; code?: { lang: string; value: string } }[];
};

const BASE = "https://qeymat.online/api/v1";

const TOPICS: Topic[] = [
  {
    id: "quickstart",
    label: "شروع سریع",
    icon: Rocket,
    group: "آغاز",
    title: "شروع سریع",
    intro:
      "در کمتر از دو دقیقه اولین نرخ را از Qeymat API دریافت کنید. پاسخ‌ها JSON هستند و مبالغ به تومان برمی‌گردند.",
    sections: [
      {
        heading: "اولین درخواست",
        body: "نماد دارایی را در انتهای مسیر قرار دهید و کلید خود را در هدر بفرستید.",
        code: {
          lang: "cURL",
          value: `curl --request GET \\
  --url ${BASE}/rates/USD \\
  --header 'X-API-Key: YOUR_API_KEY'`,
        },
      },
      {
        heading: "نمونه پاسخ",
        code: {
          lang: "JSON",
          value: `{
  "data": {
    "symbol": "USD",
    "name_fa": "دلار آمریکا",
    "buy": 228800,
    "sell": 231100,
    "unit": "TOMAN",
    "change_24h": -1.2,
    "source": "بازار آزاد",
    "updated_at": "2026-09-13T18:25:00Z"
  }
}`,
        },
      },
    ],
  },
  {
    id: "auth",
    label: "احراز درخواست",
    icon: Lock,
    group: "آغاز",
    title: "احراز درخواست با API Key",
    intro:
      "کلید API خود را در هدر هر درخواست قرار دهید. کلید را فقط روی سرور نگه دارید و در کد سمت مرورگر منتشر نکنید.",
    sections: [
      {
        heading: "هدر لازم",
        code: { lang: "HTTP", value: `X-API-Key: qym_live_XXXXXXXXXXXX` },
      },
      {
        heading: "سقف مصرف",
        body: "هر پاسخ موفق سه هدر برمی‌گرداند: X-RateLimit-Limit، X-RateLimit-Remaining و X-Quota-Remaining. وقتی سهمیه‌ی دوره تمام شود پاسخ ۴۲۹ دریافت می‌کنید.",
      },
    ],
  },
  {
    id: "rates",
    label: "دریافت همه نرخ‌ها",
    icon: FileText,
    group: "نرخ‌ها",
    title: "دریافت همه نرخ‌ها",
    intro: "فهرست کامل ارز، طلا، سکه و رمزارز در یک درخواست.",
    sections: [
      {
        heading: "مسیر",
        code: { lang: "HTTP", value: `GET ${BASE}/rates?category=currency` },
      },
      {
        heading: "پارامترها",
        body: "category یکی از currency، gold یا crypto است و اختیاری است. بدون آن همه‌ی دارایی‌ها برمی‌گردند.",
      },
    ],
  },
  {
    id: "history",
    label: "تاریخچه قیمت",
    icon: FileText,
    group: "نرخ‌ها",
    title: "تاریخچه قیمت",
    intro: "سری زمانی قیمت یک دارایی برای رسم نمودار.",
    sections: [
      {
        heading: "مسیر",
        code: { lang: "HTTP", value: `GET ${BASE}/rates/USD/history?range=30` },
      },
      {
        heading: "بازه‌ها",
        body: "range بر حسب روز است و مقدار مجاز آن بین ۱ تا ۳۶۵ است. پیش‌فرض ۷ روز است.",
      },
    ],
  },
  {
    id: "convert",
    label: "تبدیل ارز",
    icon: Repeat,
    group: "ابزارها",
    title: "تبدیل ارز به تومان",
    intro: "محاسبه‌ی معادل تومانی یک مبلغ با نرخ لحظه‌ای.",
    sections: [
      {
        heading: "مسیر",
        code: { lang: "HTTP", value: `GET ${BASE}/convert?from=USD&amount=250` },
      },
      {
        heading: "نمونه پاسخ",
        code: {
          lang: "JSON",
          value: `{
  "data": {
    "from": "USD",
    "to": "TOMAN",
    "amount": 250,
    "rate": 231100,
    "result": 57775000
  }
}`,
        },
      },
    ],
  },
  {
    id: "errors",
    label: "کدهای خطا",
    icon: FileText,
    group: "ابزارها",
    title: "کدهای خطا",
    intro: "همه‌ی خطاها با ساختار یکسان و پیام فارسی برمی‌گردند.",
    sections: [
      {
        heading: "ساختار خطا",
        code: {
          lang: "JSON",
          value: `{
  "error": {
    "code": "quota_exceeded",
    "message": "سقف درخواست‌های این دوره تمام شده است."
  }
}`,
        },
      },
      {
        heading: "فهرست کدها",
        body: "missing_api_key (۴۰۱)، invalid_api_key (۴۰۱)، no_active_plan (۴۰۳)، not_found (۴۰۴)، quota_exceeded (۴۲۹)، rate_limited (۴۲۹).",
      },
    ],
  },
];

export default function DocsBoard() {
  const [active, setActive] = useState("quickstart");
  const [copied, setCopied] = useState("");

  const topic = TOPICS.find((item) => item.id === active) ?? TOPICS[0];
  const groups = [...new Set(TOPICS.map((item) => item.group))];

  const copy = async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* در محیط ناامن کلیپ‌بورد در دسترس نیست */
    }
  };

  return (
    <main className="pb-20 pt-10">
      <div className="content-width grid gap-9 lg:grid-cols-[210px_minmax(0,1fr)_180px]">
        <aside className="lg:sticky lg:top-[92px] lg:self-start">
          <span className="block text-[11px] font-bold text-muted">مستندات Qeymat API</span>
          <nav className="mt-3 space-y-4">
            {groups.map((group) => (
              <div key={group}>
                <small className="mb-1.5 block text-2xs font-semibold text-[#a2acb2]">{group}</small>
                {TOPICS.filter((item) => item.group === group).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-right text-[12px] font-semibold transition-colors ${
                      active === item.id ? "bg-green-soft text-green-dark" : "text-[#525d66] hover:bg-soft"
                    }`}
                  >
                    <item.icon className="h-[15px] w-[15px] shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <article className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            مستندات
            <ChevronLeft className="h-3.5 w-3.5" />
            {topic.label}
          </div>
          <h1 className="mt-3 text-[28px] font-extrabold tracking-[-1px]">{topic.title}</h1>
          <p className="mt-3 max-w-[66ch] text-[13px] leading-7 text-muted">{topic.intro}</p>

          <div className="mt-6 flex items-center gap-3 rounded-xl border border-green-soft bg-green-soft/60 p-4">
            <Check className="h-4 w-4 shrink-0 text-green-dark" />
            <span className="flex flex-col">
              <strong className="text-[12px]">Base URL</strong>
              <code dir="ltr" className="mt-0.5 font-mono text-[11.5px] text-green-dark">
                {BASE}
              </code>
            </span>
          </div>

          {topic.sections.map((section, index) => (
            <section key={section.heading} className="mt-8">
              <h2 className="text-[17px] font-bold">{section.heading}</h2>
              {section.body ? (
                <p className="mt-2 max-w-[66ch] text-[12.5px] leading-7 text-muted">{section.body}</p>
              ) : null}
              {section.code ? (
                <div dir="ltr" className="mt-3 overflow-hidden rounded-xl border border-line bg-[#fbfcfb]">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2">
                    <span className="font-mono text-[10.5px] text-muted">{section.code.lang}</span>
                    <button
                      type="button"
                      onClick={() => copy(section.code!.value, `${topic.id}-${index}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] font-semibold text-[#55616a] hover:bg-soft"
                    >
                      {copied === `${topic.id}-${index}` ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied === `${topic.id}-${index}` ? "کپی شد" : "کپی"}
                    </button>
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-[11.5px] leading-6 text-[#3f4c55]">
                    {section.code.value}
                  </pre>
                </div>
              ) : null}
            </section>
          ))}
        </article>

        <aside className="hidden lg:sticky lg:top-[92px] lg:block lg:self-start">
          <span className="block text-[11px] font-bold text-muted">در این صفحه</span>
          <ul className="mt-3 space-y-2">
            {topic.sections.map((section) => (
              <li key={section.heading} className="text-[11.5px] text-[#6b757c]">
                {section.heading}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
