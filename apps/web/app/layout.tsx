import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import ServiceWorkerBridge from "@/components/pwa/ServiceWorkerBridge";
import { themeInitScript } from "@/components/theme/theme";

const vazirmatn = localFont({
  src: [
    { path: "../public/fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Vazirmatn-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/Vazirmatn-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
  fallback: ["Tahoma", "sans-serif"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "قیمت — نرخ لحظه‌ای دلار، طلا، سکه و رمزارز",
    template: "%s | قیمت",
  },
  description:
    "نرخ لحظه‌ای دلار، ارز، طلا، سکه و رمزارز بازار ایران، نمودار و مقایسه تا ۱۰ سال، مبدل تومان و هشدار قیمت.",
  keywords: [
    "قیمت دلار",
    "نرخ ارز",
    "قیمت طلا",
    "قیمت سکه",
    "قیمت تتر",
    "قیمت بیت‌کوین",
    "API نرخ ارز",
    "qeymat",
  ],
  applicationName: "قیمت",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: "قیمت",
    title: "قیمت — نرخ لحظه‌ای بازار ایران",
    description: "ارز، طلا، سکه و رمزارز در یک نگاه، با API و اعلان قیمت.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "قیمت" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "قیمت — نرخ لحظه‌ای بازار ایران",
    description: "ارز، طلا، سکه و رمزارز در یک نگاه.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    title: "قیمت",
    statusBarStyle: "default",
  },
  robots: { index: true, follow: true },
  authors: [{ name: "علی چترایی" }],
  creator: "تیم برنامه‌نویسی آ",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0c332a" },
    { media: "(prefers-color-scheme: dark)", color: "#070e0c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-page text-ink">
        {children}
        <ServiceWorkerBridge />
      </body>
    </html>
  );
}
