import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import OtpLogin from "@/components/layout/OtpLogin";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ورود", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    const next = (await searchParams).next || "";
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/panel";
    redirect(user.role === "ADMIN" ? "/admin" : safe);
  }

  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <OtpLogin />
    </Suspense>
  );
}
