import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { confirmGrant, startGrant } from "@/lib/admin-grant";

export const dynamic = "force-dynamic";

const schema = z.object({
  step: z.enum(["start", "confirm"]),
  userId: z.string().min(1),
  kind: z.enum(["PLUS_PLAN", "API_PLAN"]),
  planId: z.string().min(1),
  secret: z.string().max(200).optional(),
});

/** ارتقای دستی کاربر به پریمیوم — مرحله‌ی اول ارسال کد، مرحله‌ی دوم تأیید */
export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "درخواست نامعتبر است." } }, { status: 400 });
  }
  const { step, secret, ...grant } = parsed.data;

  const result =
    step === "start" ? await startGrant(admin, grant) : await confirmGrant(admin, grant, secret ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: { code: "grant_failed", message: result.message } }, { status: 400 });
  }
  return NextResponse.json(result);
}
