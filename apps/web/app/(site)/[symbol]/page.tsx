import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AssetDetail from "@/components/market/AssetDetail";
import { getSeries, getSnapshot } from "@/lib/market";
import type { RateView } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online";

/** فردایی و هرات صفحهٔ جدا ندارند؛ canonical دلار /usd است */
const USD_FAMILY = ["USD_FARDA", "USD_HERAT"];

async function findAsset(param: string): Promise<RateView | null> {
  const symbol = decodeURIComponent(param).toUpperCase();
  const snapshot = await getSnapshot();
  return snapshot.assets.find((asset) => asset.symbol === symbol) ?? null;
}

/** پرسش‌های پرتکرار صفحه؛ برای دلار طبق دیزاین، برای بقیه با نام دارایی */
function faqsFor(asset: RateView): { q: string; a: string }[] {
  const base = [
    {
      q: `قیمت ${asset.nameFa} امروز چند است؟`,
      a: "نرخ لحظه‌ای در لحظهٔ آخرین به‌روزرسانی بالای همین صفحه، با ساعت و منبع، نمایش داده می‌شود.",
    },
    ...(asset.symbol === "USD"
      ? [
          {
            q: "فرق دلار نقدی، فردایی و هرات چیست؟",
            a: "نقدی نرخ معاملهٔ همان‌روزهٔ تهران است. فردایی برای تحویل روز کاری بعد است و نرخ هرات از بازار هرات گزارش می‌شود.",
          },
        ]
      : []),
    {
      q: `قیمت ${asset.nameFa} هر چند وقت به‌روز می‌شود؟`,
      a: "در ساعات بازار چند بار در دقیقه. زمان آخرین به‌روزرسانی همیشه کنار عدد است.",
    },
    {
      q: "آیا قیمت به ما توصیهٔ خرید می‌دهد؟",
      a: "نه. قیمت فقط عدد را گزارش می‌کند و تصمیم با شماست.",
    },
  ];
  return base;
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const asset = await findAsset(symbol).catch(() => null);
  if (!asset) return {};
  const slug = asset.symbol.toLowerCase();
  const title =
    asset.symbol === "USD"
      ? "قیمت دلار امروز — نقدی، فردایی و هرات"
      : `قیمت ${asset.nameFa} امروز — لحظه‌ای`;
  return {
    title,
    description: `قیمت لحظه‌ای ${asset.nameFa} به ${asset.unit === "USD" ? "دلار" : "تومان"}، با نمودار ۱ روز تا ۱۰ سال، کمترین و بیشترین، و منبع و زمان هر عدد.`,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function AssetPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: param } = await params;
  const upper = decodeURIComponent(param).toUpperCase();
  if (USD_FAMILY.includes(upper)) redirect("/usd");

  const [snapshot, asset] = await Promise.all([getSnapshot(), findAsset(param)]);
  if (!asset) notFound();
  // آدرس canonical همیشه با حروف کوچک است
  if (param !== asset.symbol.toLowerCase()) redirect(`/${asset.symbol.toLowerCase()}`);

  const series = await getSeries(asset.symbol, "1w").catch(() => null);
  const faqs = faqsFor(asset);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "بازار", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: asset.nameFa, item: `${SITE}/${asset.symbol.toLowerCase()}` },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  const rateSchema =
    asset.category === "CURRENCY"
      ? {
          "@context": "https://schema.org",
          "@type": "ExchangeRateSpecification",
          currency: asset.symbol,
          currentExchangeRate: { "@type": "UnitPriceSpecification", price: asset.sell, priceCurrency: "IRR" },
          name: `نرخ ${asset.nameFa}`,
        }
      : {
          "@context": "https://schema.org",
          "@type": "Product",
          name: asset.nameFa,
          offers: { "@type": "Offer", price: asset.sell, priceCurrency: asset.unit === "USD" ? "USD" : "IRR" },
        };

  return (
    <>
      <AssetDetail symbol={asset.symbol} initialSnapshot={snapshot} initialSeries={series} faqs={faqs} />
      {[breadcrumb, faqSchema, rateSchema].map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </>
  );
}
