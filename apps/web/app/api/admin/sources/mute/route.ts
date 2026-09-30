import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { setMuted } from "@/lib/source-admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  key: z.string().min(2),
  /** خالی یعنی کل منبع؛ با نماد فقط همان دارایی از این منبع */
  symbol: z.string().min(2).max(20).optional(),
  muted: z.boolean(),
});

/**
 * بی‌اثر کردن منبع: همچنان خوانده و در پنل نمایش داده می‌شود، ولی در نرخ
 * نمایشی اثری ندارد. از دور بعدی اجماع (چند ثانیه) اعمال می‌شود.
 */
export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "درخواست نامعتبر است." } }, { status: 400 });
  }
  await setMuted(parsed.data.key, parsed.data.muted, parsed.data.symbol?.toUpperCase());
  return NextResponse.json({ ok: true });
}
