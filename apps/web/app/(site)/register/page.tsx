import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/layout/AuthForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ثبت‌نام", robots: { index: false } };

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return <AuthForm mode="register" />;
}
