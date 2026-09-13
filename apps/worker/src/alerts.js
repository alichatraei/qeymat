import { createRequire } from "node:module";
import webpush from "web-push";
import { log } from "./lib/log.js";

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
 * برای دارایی‌هایی که تازه به‌روز شده‌اند، هشدارهای فعال را بررسی
 * و اعلان مرورگر می‌فرستد.
 *
 * @param {Array<{asset: object, sell: number, previousSell: number|null}>} touched
 */
export async function checkAlerts(touched) {
  if (!ensureVapid()) return;

  const assetIds = touched.map((item) => item.asset.id);
  const alerts = await prisma.priceAlert.findMany({
    where: { assetId: { in: assetIds }, isActive: true },
    include: { sub: true, asset: true },
  });
  if (!alerts.length) return;

  const priceByAsset = new Map(touched.map((item) => [item.asset.id, item]));

  for (const alert of alerts) {
    const current = priceByAsset.get(alert.assetId);
    if (!current) continue;

    const crossed =
      alert.direction === "ABOVE"
        ? current.sell >= alert.threshold &&
          (current.previousSell === null || current.previousSell < alert.threshold)
        : current.sell <= alert.threshold &&
          (current.previousSell === null || current.previousSell > alert.threshold);

    if (!crossed) continue;

    const direction = alert.direction === "ABOVE" ? "بالاتر از" : "پایین‌تر از";
    const sent = await send(alert.sub, {
      title: `${alert.asset.nameFa} ${direction} هدف شما رسید`,
      body: `قیمت فعلی ${format(current.sell)} تومان است.`,
      url: `/?symbol=${alert.asset.symbol}`,
      tag: `alert-${alert.id}`,
    });

    if (sent) {
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { isActive: false, firedAt: new Date() },
      });
      log.info(`هشدار ${alert.asset.symbol} ارسال شد`);
    }
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
      { TTL: 60 * 60 * 6 },
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
