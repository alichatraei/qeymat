import "server-only";
import webpush from "web-push";
import { prisma } from "@qeymat/db";

type Payload = { title: string; body: string; url?: string; tag?: string };

let configured = false;

function ensureVapid() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@qeymat.online",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** ارسال اعلان به فهرستی از اشتراک‌ها؛ اشتراک‌های باطل حذف می‌شوند. */
export async function sendPush(subs: Sub[], payload: Payload) {
  if (!ensureVapid()) return { sent: 0, failed: subs.length, error: "کلید VAPID روی سرور تنظیم نشده است." };
  if (!subs.length) return { sent: 0, failed: 0, error: null };

  const message = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
          // سرویس پوش اگر از ایران جواب ندهد، درخواست کاربر معطل نماند
          { TTL: 60 * 60 * 6, timeout: 10_000 },
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const status = (error as { statusCode?: number })?.statusCode;
        lastError = status ? `سرویس پوش کد ${status} برگرداند.` : (error as Error)?.message || "خطای ناشناخته";
        console.warn("[push]", new URL(sub.endpoint).host, lastError);
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );

  return { sent, failed, error: lastError };
}

/** اعلان به همه‌ی دستگاه‌های یک کاربر. */
export async function notifyUser(userId: string, payload: Payload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  return sendPush(subs, payload);
}
