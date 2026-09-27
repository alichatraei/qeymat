import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PLANS, PLUS_PLANS } from "@qeymat/shared";
import { getSessionUser } from "@/lib/auth";
import { saveOverrides, type PlanOverride } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const schema = z.record(
  z.string(),
  z.object({
    price: z.number().int().min(1000).max(1_000_000_000),
    active: z.boolean(),
    limit: z.number().int().min(100).max(100_000_000).optional(),
    smsAlerts: z.number().int().min(0).max(1000).optional(),
  }),
);

/** قیمت، فعال بودن و سقف هر پلن قیمت پلاس و API */
export async function PUT(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "قیمت‌ها باید عدد صحیح و دست‌کم ۱٬۰۰۰ تومان باشند." } },
      { status: 400 },
    );
  }

  const known = new Set([...PLANS.map((plan) => plan.id), ...PLUS_PLANS.map((plan) => plan.id)]);
  const overrides: Record<string, PlanOverride> = {};
  for (const [id, value] of Object.entries(parsed.data)) {
    if (!known.has(id)) continue;
    overrides[id] = value;
  }
  await saveOverrides(overrides);
  return NextResponse.json({ ok: true });
}
