import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { findApiPlan, findPlusPlan, getPaymentConfig } from "@/lib/pricing";
import { saveReceipt } from "@/lib/uploads";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

function error(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * ثبت پرداخت کارت‌به‌کارت: تصویر فیش + شماره پیگیری.
 * مبلغ از قیمت فعلی پلن روی سرور خوانده می‌شود؛ مدیر بعد از بررسی تأیید می‌کند.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return error("unauthenticated", "برای ثبت فیش ابتدا وارد شوید.", 401);

  const payment = await getPaymentConfig();
  if (!payment.methods.card) return error("method_disabled", "پرداخت کارت‌به‌کارت فعلاً فعال نیست.");

  const form = await request.formData().catch(() => null);
  if (!form) return error("invalid_body", "اطلاعات ارسالی نامعتبر است.");

  const kind = String(form.get("kind") ?? "");
  const planId = String(form.get("plan") ?? "");
  const file = form.get("receipt");
  const trackingCode = String(form.get("trackingCode") ?? "").trim().slice(0, 60) || null;
  const last4 = String(form.get("payerCardLast4") ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\D/g, "")
    .slice(-4) || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;

  if (kind !== "API_PLAN" && kind !== "PLUS_PLAN") return error("invalid_kind", "نوع خرید نامعتبر است.");
  const plan = kind === "API_PLAN" ? await findApiPlan(planId) : await findPlusPlan(planId);
  if (!plan || !plan.active) return error("invalid_plan", "پلن انتخابی معتبر نیست.");
  if (!(file instanceof File) || file.size === 0) return error("missing_receipt", "تصویر فیش واریزی را انتخاب کنید.");

  // جلوگیری از انبوه فیش‌های در انتظار از یک کاربر
  const pending = await prisma.receiptPayment.count({ where: { userId: user.id, status: "PENDING" } });
  if (pending >= 3) {
    return error("too_many_pending", "چند فیش در انتظار بررسی دارید؛ لطفاً تا تأیید آن‌ها صبر کنید.", 429);
  }

  const saved = await saveReceipt(file);
  if (!saved.ok) return error("invalid_receipt", saved.message);

  const receipt = await prisma.receiptPayment.create({
    data: {
      userId: user.id,
      kind,
      plan: plan.id,
      amountToman: plan.price,
      receiptFile: saved.name,
      receiptMime: saved.mime,
      trackingCode,
      payerCardLast4: last4,
      userNote: note,
    },
  });

  // اعلان به مدیران
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      notifyUser(admin.id, {
        title: "فیش واریزی تازه",
        body: `${kind === "PLUS_PLAN" ? "قیمت پلاس" : "وب‌سرویس"} ${plan.label} — ${new Intl.NumberFormat("fa-IR").format(plan.price)} تومان`,
        url: "/admin",
      }).catch(() => null),
    ),
  );

  return NextResponse.json({ ok: true, id: receipt.id });
}
