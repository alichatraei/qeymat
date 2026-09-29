import { createRequire } from "node:module";
import webpush from "web-push";
import { log } from "./lib/log.js";
import { sendAlertSms } from "./lib/sms.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

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

/**
 * برای دارایی‌هایی که تازه به‌روز شده‌اند، هشدارهای فعال را بررسی می‌کند.
 *
 * هشدار فقط به کاربر واردشده تعلق دارد:
 *   - اعلان مرورگر به همه‌ی دستگاه‌هایی که کاربر اعلان را رویشان روشن کرده
 *   - پیامک، اگر هشدار پیامکی باشد و کاربر هنوز اشتراک قیمت پلاس فعال داشته باشد
 *
 * هشدار با «عبور» از قیمت هدف شلیک می‌شود، نه با بودن در آن سمت؛ پس با
 * هر تیک تکرار نمی‌شود. بعد از شلیک غیرفعال می‌شود.
 *
 * @param {Array<{asset: object, sell: number, previousSell: number|null}>} touched
 */
export async function checkAlerts(touched) {
  const pushReady = ensureVapid();

  const assetIds = touched.map((item) => item.asset.id);
  const alerts = await prisma.priceAlert.findMany({
    where: { assetId: { in: assetIds }, isActive: true, userId: { not: null } },
    include: {
      sub: true,
      asset: true,
      user: {
        select: {
          id: true,
          phone: true,
          isActive: true,
          pushSubscriptions: true,
          plusSubscriptions: {
            where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!alerts.length) return;

  const priceByAsset = new Map(touched.map((item) => [item.asset.id, item]));

  for (const alert of alerts) {
    const current = priceByAsset.get(alert.assetId);
    if (!current || !alert.user?.isActive) continue;

    const crossed =
      alert.direction === "ABOVE"
        ? current.sell >= alert.threshold &&
          (current.previousSell === null || current.previousSell < alert.threshold)
        : current.sell <= alert.threshold &&
          (current.previousSell === null || current.previousSell > alert.threshold);

    if (!crossed) continue;

    const direction = alert.direction === "ABOVE" ? "بالاتر از" : "پایین‌تر از";
    const unit = alert.asset.unit === "USD" ? "دلار" : "تومان";
    const channels = [];

    if (alert.push && pushReady) {
      const subs = alert.user.pushSubscriptions.length
        ? alert.user.pushSubscriptions
        : alert.sub
          ? [alert.sub]
          : [];
      let delivered = 0;
      for (const sub of subs) {
        const ok = await send(sub, {
          title: `${alert.asset.nameFa} ${direction} ${format(alert.threshold)} ${unit}`,
          body: `قیمت فعلی ${format(current.sell)} ${unit} است.`,
          url: `/chart?symbol=${alert.asset.symbol}`,
          tag: `alert-${alert.id}`,
        });
        if (ok) delivered += 1;
      }
      if (delivered) channels.push(`push×${delivered}`);
    }

    if (alert.sms && alert.user.phone && alert.user.plusSubscriptions.length) {
      const ok = await sendAlertSms({
        phone: alert.user.phone,
        price: current.sell,
        symbol: alert.asset.symbol,
        name: alert.asset.nameFa,
      });
      if (ok) channels.push("sms");
    }

    // حتی اگر هیچ کانالی تحویل نداد غیرفعال می‌شود؛ وگرنه با هر عبور بعدی
    // دوباره تلاش و احتمالاً پیامک تکراری فرستاده می‌شد.
    await prisma.priceAlert.update({
      where: { id: alert.id },
      data: { isActive: false, firedAt: new Date() },
    });
    log.info(`هشدار ${alert.asset.symbol} شلیک شد (${channels.join("، ") || "بدون کانال تحویل"})`);
  }
}

/** ارسال اعلان به همه‌ی دستگاه‌های یک کاربر (یا همه، وقتی userId خالی است). */
export async function broadcast(payload, userId = null) {
  if (!ensureVapid()) return { sent: 0, failed: 0 };

  const subs = await prisma.pushSubscription.findMany({
    where: userId ? { userId } : {},
  });

  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    if (await send(sub, payload)) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

async function send(sub, payload) {
  if (!sub) return false;
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      // سرویس‌های پوش (FCM) از ایران گاهی جواب نمی‌دهند؛ بدون timeout کل چرخه‌ی نرخ می‌ایستاد
      { TTL: 60 * 60 * 6, timeout: 10000 },
    );
    return true;
  } catch (error) {
    // 404/410 یعنی اشتراک باطل شده است
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      log.warn("ارسال پوش ناموفق:", error?.message || error);
    }
    return false;
  }
}

function format(value) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);
}
