import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPlusStatus } from "@/lib/plus";

export const dynamic = "force-dynamic";

/** کاربر جاری و وضعیت قیمت پلاس — برای اپ موبایل و بخش‌های سمت کاربر */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "وارد نشده‌اید." } }, { status: 401 });
  }
  const plus = await getPlusStatus(user.id);
  return NextResponse.json(
    { user: { id: user.id, name: user.name, phone: user.phone, role: user.role }, plus },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
