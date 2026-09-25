import { redirect } from "next/navigation";
import { getSetting } from "@/lib/market";

export const dynamic = "force-dynamic";

/**
 * خرید اکانت هوش مصنوعی و پرداخت ارزی دیگر در «قیمت» انجام نمی‌شود و به
 * آساپی منتقل شده است. لینک‌های قدیمی و میان‌برهای نصب‌شده‌ی PWA همین‌جا
 * به آساپی هدایت می‌شوند.
 */
export default async function AiPage() {
  redirect(await getSetting<string>("asapay.url", "https://asapay.pro"));
}
