import type { Metadata } from "next";
import DocsBoard from "@/components/market/DocsBoard";

export const metadata: Metadata = {
  title: "مستندات API",
  description: "راهنمای اتصال به API نرخ ارز، طلا، سکه و رمزارز قیمت.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return <DocsBoard />;
}
