import type { MetadataRoute } from "next";
import { prisma } from "@qeymat/db";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/converter`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/developers`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/ai`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  try {
    const assets = await prisma.asset.findMany({ where: { isActive: true }, select: { symbol: true } });
    return [
      ...staticPages,
      ...assets.map((asset) => ({
        url: `${base}/converter?symbol=${asset.symbol}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return staticPages;
  }
}
