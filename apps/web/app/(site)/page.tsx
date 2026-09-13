import type { Metadata } from "next";
import MarketBoard from "@/components/market/MarketBoard";
import { getHistory, getSnapshot } from "@/lib/market";
import type { AssetCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "نرخ لحظه‌ای دلار، طلا، سکه و رمزارز",
  description:
    "قیمت زنده دلار، یورو، درهم، طلای ۱۸ عیار، سکه امامی، تتر و بیت‌کوین از منابع نوبیتکس، الان چند، بن‌بست و TGJU.",
  alternates: { canonical: "/" },
};

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const [snapshot, history] = await Promise.all([getSnapshot(), getHistory("USD", 7)]);

  const requested = String(params.category || "").toUpperCase();
  const category: AssetCategory = ["CURRENCY", "GOLD", "CRYPTO"].includes(requested)
    ? (requested as AssetCategory)
    : "CURRENCY";

  const usd = snapshot.assets.find((asset) => asset.symbol === "USD");

  return (
    <>
      <MarketBoard initialSnapshot={snapshot} initialHistory={history} initialCategory={category} />
      {/* داده‌ی ساختاریافته برای نتایج جست‌وجوی گوگل */}
      {usd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "قیمت",
              url: process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online",
              inLanguage: "fa-IR",
              potentialAction: {
                "@type": "SearchAction",
                target: `${process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online"}/converter?symbol={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      ) : null}
    </>
  );
}
