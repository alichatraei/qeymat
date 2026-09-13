import type { Metadata } from "next";
import { prisma } from "@qeymat/db";
import { getRate, getSetting } from "@/lib/market";
import { fa, tomanPrice } from "@qeymat/shared";
import AiStore from "@/components/market/AiStore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "خرید اکانت هوش مصنوعی و پرداخت ارزی",
  description:
    "خرید اشتراک ChatGPT، Claude و Cursor، شارژ اعتبار API و پرداخت صورتحساب‌های ارزی با ریال — با نرخ روز و کارمزد شفاف.",
  alternates: { canonical: "/ai" },
};

export default async function AiPage() {
  const [products, usd, feePercent, asapayUrl] = await Promise.all([
    prisma.aiProduct.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getRate("USD"),
    getSetting<number>("ai.feePercent", 10),
    getSetting<string>("asapay.url", "https://asapay.pro"),
  ]);

  const usdRate = usd?.sell ?? 0;

  const items = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    icon: product.icon,
    period: product.period,
    badge: product.badge,
    features: product.features,
    priceUsd: product.priceUsd,
    priceToman:
      product.fixedToman ??
      (product.priceUsd
        ? tomanPrice(product.priceUsd, usdRate, product.feePercent ?? feePercent)
        : 0),
  }));

  return (
    <AiStore
      items={items}
      usdRate={usdRate}
      usdLabel={usdRate ? fa(usdRate) : "—"}
      asapayUrl={asapayUrl}
    />
  );
}
