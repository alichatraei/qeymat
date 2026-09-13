import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/layout/AuthForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ورود مدیر", robots: { index: false } };

/** ورود با ایمیل و گذرواژه — فقط برای مدیران. کاربران عادی با موبایل وارد می‌شوند. */
export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/panel");

  return <AuthForm mode="login" />;
}
