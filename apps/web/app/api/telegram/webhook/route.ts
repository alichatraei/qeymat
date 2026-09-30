import { NextRequest, NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";

/**
 * Webhook ربات تلگرام. پاسخ هر پیام در بدنه‌ی همین پاسخ برمی‌گردد (سرور به
 * api.telegram.org دسترسی ندارد). تلگرام TELEGRAM_WEBHOOK_SECRET را در سربرگ
 * X-Telegram-Bot-Api-Secret-Token می‌فرستد؛ بدون آن درخواست پذیرفته نمی‌شود.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const update = await request.json().catch(() => null);
  if (!update) return NextResponse.json({});

  try {
    const reply = await handleUpdate(update);
    // بدنه‌ی خالی یعنی «پاسخی نیست»؛ تلگرام دوباره نمی‌فرستد
    return NextResponse.json(reply ?? {});
  } catch (error) {
    console.error("[telegram] پاسخ به پیام ناموفق بود:", error);
    // ۲۰۰ تا تلگرام همین پیام را بی‌پایان دوباره نفرستد
    return NextResponse.json({});
  }
}
