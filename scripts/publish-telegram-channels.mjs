import { pathToFileURL } from "node:url";

const TIME_ZONE = "Asia/Tehran";

export const CHANNELS = [
  { key: "GOLD", symbol: "GOLD18", title: "قیمت طلای ۱۸ عیار", emoji: "🟡" },
  { key: "EUR", symbol: "EUR", title: "قیمت یورو", emoji: "🇪🇺" },
  { key: "USD", symbol: "USD", title: "قیمت دلار", emoji: "💵" },
  { key: "USDT", symbol: "USDT", title: "قیمت تتر", emoji: "₮" },
];

/** یوزرنیم بدون @، لینک t.me و شناسهٔ عددی بدون پیشوند -100 را به فرمت موردقبول Bot API برمی‌گرداند. */
export function normalizeChannelId(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^-\d+$/.test(value)) return value;
  if (/^\d+$/.test(value)) return `-100${value}`;
  const link = value.match(/^(?:https?:\/\/)?t(?:elegram)?\.me\/(?:s\/)?([A-Za-z]\w{3,31})\/?$/i);
  if (link) return `@${link[1]}`;
  if (/^[A-Za-z]\w{3,31}$/.test(value)) return `@${value}`;
  return value;
}

function parseClock(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`زمان نامعتبر است: ${value || "(خالی)"}؛ نمونهٔ درست: 09:00`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`زمان نامعتبر است: ${value}`);
  return hour * 60 + minute;
}

export function tehranMinutes(date = new Date()) {
  const parts = {};
  for (const part of new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return Number(parts.hour) * 60 + Number(parts.minute);
}

/** بازهٔ عادی و بازهٔ عبوری از نیمه‌شب را پشتیبانی می‌کند؛ دو سر بازه شامل‌اند. */
export function isWithinSchedule(date, start = "09:00", end = "22:00") {
  const now = tehranMinutes(date);
  const from = parseClock(start);
  const to = parseClock(end);
  return from <= to ? now >= from && now <= to : now >= from || now <= to;
}

const faNumber = (value, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(Number(value));

export function stampText(date = new Date()) {
  const parts = {};
  for (const part of new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return `${parts.year}/${parts.month}/${parts.day} | ${parts.hour}:${parts.minute}`;
}

export function formatCaption(spec, asset, date = new Date(), mainChannel = "") {
  const price = faNumber(asset.sell, asset.unit === "USD" && asset.sell < 100 ? 2 : 0);
  const unit = asset.unit === "USD" ? "دلار" : "تومان";
  const change = Number(asset.changePercent) || 0;
  const movement = change
    ? `${change > 0 ? "▲ +" : "▼ −"}٪${faNumber(Math.abs(change), 2)} امروز`
    : "بدون تغییر امروز";
  const main = mainChannel ? `\n\nکانال اصلی قیمت: ${mainChannel}` : "";

  return [
    `${spec.emoji} ${spec.title} لحظه‌ای`,
    "",
    `💰 ${price} ${unit}`,
    `${change >= 0 ? "📈" : "📉"} ${movement}`,
    "",
    `🕒 ${stampText(date)}`,
    "🔗 qeymat.online",
  ].join("\n") + main;
}

function imageUrl(site, symbol, date) {
  const version = Math.floor(date.getTime() / 60_000);
  return `${site}/api/telegram/card?s=${encodeURIComponent(symbol)}&v=${version}`;
}

async function loadSnapshot(site) {
  const response = await fetch(`${site}/api/public/rates`, {
    headers: { "User-Agent": "qeymat-telegram-publisher/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`دریافت نرخ‌ها ناموفق بود: HTTP ${response.status}`);
  const snapshot = await response.json();
  if (!Array.isArray(snapshot?.assets)) throw new Error("پاسخ نرخ‌ها ساختار معتبر ندارد");
  return snapshot;
}

async function telegramRequest(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description || `HTTP ${response.status}`);
  }
  return payload.result;
}

async function inspectTelegramTargets(token, targets) {
  const me = await telegramRequest(token, "getMe", {});
  console.log(`توکن به ربات ${me.username ? `@${me.username}` : "(بدون نام کاربری)"} متصل است`);

  const results = await Promise.allSettled(targets.map(async (target) => {
    let phase = "getChat";
    try {
      const chat = await telegramRequest(token, "getChat", { chat_id: target.channel });
      phase = "getChatMember";
      const member = await telegramRequest(token, "getChatMember", {
        chat_id: target.channel,
        user_id: me.id,
      });
      const isAdmin = member.status === "administrator" || member.status === "creator";
      const canPost = member.status === "creator" || member.can_post_messages === true;
      const configuredIdMatches = /^-?\d+$/.test(target.channel)
        ? String(chat.id) === target.channel
        : null;

      console.log(
        `TELEGRAM_CHANNEL_${target.key}: چت قابل دسترسی (type=${chat.type})؛ ` +
        `شناسه ${configuredIdMatches === null ? "username" : configuredIdMatches ? "مطابق" : "نامطابق"}؛ ` +
        `وضعیت ربات=${member.status}؛ مجوز ارسال=${canPost ? "فعال" : "غیرفعال"}`,
      );

      if (!isAdmin || !canPost) {
        throw new Error("ربات باید در خود همین کانال ادمین باشد و Post Messages فعال باشد");
      }
    } catch (error) {
      const kind = target.channel.startsWith("@") ? `یوزرنیم ${target.channel}` : "شناسهٔ عددی";
      let hint = "";
      if (/chat not found/i.test(error.message)) {
        hint = target.channel.startsWith("@")
          ? "؛ یا یوزرنیم کانال اشتباه است یا کانال خصوصی است (برای کانال خصوصی باید شناسهٔ ‎-100… را در Secret بگذارید و ربات از قبل ادمین باشد)"
          : "؛ شناسهٔ عددی اشتباه است یا ربات هنوز به این کانال اضافه نشده (اول ربات را ادمین کانال کنید)";
      }
      console.error(`بررسی TELEGRAM_CHANNEL_${target.key} (${kind}) در ${phase} ناموفق بود: ${error.message}${hint}`);
      throw error;
    }
  }));

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) {
    throw new Error(`بررسی دسترسی ${failures.length} مقصد از ${targets.length} مقصد ناموفق بود`);
  }
}

async function sendPhoto({ token, target, photo, caption, chartUrl, mainChannelUrl }) {
  const buttons = [{ text: "📈 نمودار و جزئیات", url: chartUrl }];
  if (mainChannelUrl) buttons.push({ text: "کانال اصلی قیمت", url: mainChannelUrl });

  try {
    await telegramRequest(token, "sendPhoto", {
      chat_id: target.channel,
      photo,
      caption,
      reply_markup: { inline_keyboard: [buttons] },
    });
  } catch (error) {
    throw new Error(`ارسال به TELEGRAM_CHANNEL_${target.key} ناموفق بود: ${error.message}`);
  }
}

export async function publish(env = process.env, now = new Date()) {
  const start = env.TELEGRAM_PUBLISH_START || "09:00";
  const end = env.TELEGRAM_PUBLISH_END || "22:00";
  const forced = env.TELEGRAM_FORCE_PUBLISH === "true";
  if (!forced && !isWithinSchedule(now, start, end)) {
    console.log(`خارج از بازهٔ انتشار ${start} تا ${end} به وقت تهران؛ ارسالی انجام نشد.`);
    return { skipped: true, sent: 0 };
  }

  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN تنظیم نشده است");

  const site = (env.NEXT_PUBLIC_SITE_URL || "https://qeymat.online").replace(/\/+$/, "");
  const mainChannelUrl = env.TELEGRAM_MAIN_CHANNEL_URL || "";
  const mainChannelLabel = env.TELEGRAM_MAIN_CHANNEL_LABEL || mainChannelUrl;
  const targets = CHANNELS.map((spec) => ({
    ...spec,
    channel: normalizeChannelId(env[`TELEGRAM_CHANNEL_${spec.key}`]),
  }));
  const missing = targets.filter((item) => !item.channel).map((item) => `TELEGRAM_CHANNEL_${item.key}`);
  if (missing.length) throw new Error(`شناسهٔ کانال‌ها تنظیم نشده است: ${missing.join(", ")}`);

  const uniqueTargets = new Set(targets.map((target) => target.channel));
  if (uniqueTargets.size !== targets.length) {
    throw new Error("شناسهٔ مقصد تکراری است؛ هر چهار Secret باید به یک کانال جداگانه اشاره کنند");
  }

  await inspectTelegramTargets(token, targets);

  const snapshot = await loadSnapshot(site);
  const bySymbol = new Map(snapshot.assets.map((asset) => [asset.symbol, asset]));
  const dryRun = env.TELEGRAM_DRY_RUN === "true";

  const results = await Promise.allSettled(
    targets.map(async (spec) => {
      const asset = bySymbol.get(spec.symbol);
      if (!asset) throw new Error(`نرخ ${spec.symbol} در اسنپ‌شات موجود نیست`);
      const caption = formatCaption(spec, asset, now, mainChannelLabel);
      if (dryRun) {
        console.log(`[dry-run] TELEGRAM_CHANNEL_${spec.key}\n${caption}\n`);
        return;
      }
      await sendPhoto({
        token,
        target: spec,
        photo: imageUrl(site, spec.symbol, now),
        caption,
        chartUrl: `${site}/chart?symbol=${spec.symbol}`,
        mainChannelUrl,
      });
      console.log(`✓ پیام ${spec.title} به TELEGRAM_CHANNEL_${spec.key} ارسال شد`);
    }),
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) {
    failures.forEach((result) => console.error(result.reason?.message || result.reason));
    throw new Error(`${failures.length} کانال از ${targets.length} کانال به‌روزرسانی نشد`);
  }
  return { skipped: false, sent: targets.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  publish().catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });
}
