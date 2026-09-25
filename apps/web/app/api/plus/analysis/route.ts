import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPlusStatus } from "@/lib/plus";
import { analyze } from "@/lib/analysis";

export const dynamic = "force-dynamic";

/** تحلیل قیمت یک دارایی — فقط برای مشترکان قیمت پلاس. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "برای دیدن تحلیل وارد شوید." } },
      { status: 401 },
    );
  }

  const plus = await getPlusStatus(user.id);
  if (!plus.active) {
    return NextResponse.json(
      { error: { code: "plus_required", message: "تحلیل قیمت مخصوص مشترکان قیمت پلاس است." } },
      { status: 402 },
    );
  }

  const analysis = await analyze(request.nextUrl.searchParams.get("symbol") || "USD");
  if (!analysis) {
    return NextResponse.json({ error: { code: "not_found", message: "دارایی پیدا نشد." } }, { status: 404 });
  }

  return NextResponse.json({ analysis }, { headers: { "Cache-Control": "private, max-age=60" } });
}
