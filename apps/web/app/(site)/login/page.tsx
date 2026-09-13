import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import OtpLogin from "@/components/layout/OtpLogin";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ورود", robots: { index: false } };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/panel");

  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <OtpLogin />
    </Suspense>
  );
}
