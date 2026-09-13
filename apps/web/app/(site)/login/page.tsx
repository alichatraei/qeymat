import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/layout/AuthForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ورود", robots: { index: false } };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return <AuthForm mode="login" />;
}
