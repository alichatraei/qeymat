import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { saveAppLinks } from "@/lib/app-links";

export const dynamic = "force-dynamic";

// فقط نشانی https؛ خالی یعنی آن فروشگاه نمایش داده نشود
const link = z
  .string()
  .trim()
  .max(300)
  .refine((value) => !value || /^https:\/\/[^\s]+$/i.test(value), "نشانی باید با https:// شروع شود.");

const schema = z.object({ bazaar: link, myket: link, direct: link });

/** لینک اپ اندروید در کافه‌بازار، مایکت و دانلود مستقیم */
export async function PUT(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است." } },
      { status: 400 },
    );
  }
  await saveAppLinks(parsed.data);
  return NextResponse.json({ ok: true });
}
