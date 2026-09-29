import type { MetadataRoute } from "next";
import { prisma } from "@qeymat/db";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/chart`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/converter`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/plus`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/developers`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const assets = await prisma.asset.findMany({ where: { isActive: true }, select: { symbol: true } });
    return [
      ...staticPages,
      ...assets.map((asset) => ({
        url: `${base}/chart?symbol=${asset.symbol}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticPages;
  }
}
