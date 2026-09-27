import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { savePaymentSettings } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const digits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const schema = z.object({
  methods: z.object({ zarinpal: z.boolean(), card: z.boolean() }),
  card: z.object({
    cardNumber: z.string().max(40),
    sheba: z.string().max(40),
    holder: z.string().max(80),
    bank: z.string().max(60),
    note: z.string().max(400),
  }),
});

/** شماره کارت، شبا و روش‌های فعال پرداخت */
export async function PUT(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "اطلاعات نامعتبر است." } }, { status: 400 });
  }

  const cardNumber = digits(parsed.data.card.cardNumber).replace(/\D/g, "");
  const shebaDigits = digits(parsed.data.card.sheba).toUpperCase().replace(/[^0-9]/g, "");
  if (cardNumber && cardNumber.length !== 16) {
    return NextResponse.json({ error: { code: "invalid_card", message: "شماره کارت باید ۱۶ رقم باشد." } }, { status: 400 });
  }
  if (shebaDigits && shebaDigits.length !== 24) {
    return NextResponse.json(
      { error: { code: "invalid_sheba", message: "شماره شبا باید IR و ۲۴ رقم باشد." } },
      { status: 400 },
    );
  }
  if (parsed.data.methods.card && !cardNumber && !shebaDigits) {
    return NextResponse.json(
      { error: { code: "missing_card", message: "برای فعال کردن کارت‌به‌کارت، شماره کارت یا شبا را وارد کنید." } },
      { status: 400 },
    );
  }

  await savePaymentSettings(parsed.data.methods, {
    cardNumber,
    sheba: shebaDigits ? `IR${shebaDigits}` : "",
    holder: parsed.data.card.holder.trim(),
    bank: parsed.data.card.bank.trim(),
    note: parsed.data.card.note.trim(),
  });
  return NextResponse.json({ ok: true });
}
