import test from "node:test";
import assert from "node:assert/strict";
import { CHANNELS, formatCaption, isWithinSchedule, publish, stampText, tehranMinutes } from "./publish-telegram-channels.mjs";

test("بازهٔ روزانه دو سر ساعت را شامل می‌کند", () => {
  assert.equal(isWithinSchedule(new Date("2026-10-08T05:30:00Z"), "09:00", "22:00"), true);
  assert.equal(isWithinSchedule(new Date("2026-10-08T18:30:00Z"), "09:00", "22:00"), true);
  assert.equal(isWithinSchedule(new Date("2026-10-08T19:00:00Z"), "09:00", "22:00"), false);
});

test("بازهٔ عبوری از نیمه‌شب پشتیبانی می‌شود", () => {
  assert.equal(isWithinSchedule(new Date("2026-10-08T18:30:00Z"), "22:00", "02:00"), true);
  assert.equal(isWithinSchedule(new Date("2026-10-08T21:00:00Z"), "22:00", "02:00"), true);
  assert.equal(isWithinSchedule(new Date("2026-10-08T10:00:00Z"), "22:00", "02:00"), false);
});

test("زمان تهران مستقل از منطقهٔ زمانی ماشین محاسبه می‌شود", () => {
  assert.equal(tehranMinutes(new Date("2026-10-08T05:30:00Z")), 9 * 60);
  assert.match(stampText(new Date("2026-10-08T05:30:00Z")), /۰۹:۰۰$/);
});

test("کپشن نرخ، تغییر و کانال اصلی را دارد", () => {
  const caption = formatCaption(
    CHANNELS.find((item) => item.key === "EUR"),
    { sell: 123456, unit: "TOMAN", changePercent: -1.25 },
    new Date("2026-10-08T05:30:00Z"),
    "@qeymat",
  );
  assert.match(caption, /۱۲۳٬۴۵۶ تومان/);
  assert.match(caption, /▼ −٪۱٫۲۵/);
  assert.match(caption, /@qeymat/);
});

test("انتشار، چهار کانال را با تصویر مخصوص همان نماد به‌روز می‌کند", async () => {
  const originalFetch = globalThis.fetch;
  const telegramBodies = [];
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/api/public/rates")) {
      return new Response(JSON.stringify({
        assets: CHANNELS.map((item, index) => ({
          symbol: item.symbol,
          sell: 100_000 + index,
          unit: "TOMAN",
          changePercent: index - 1,
        })),
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    telegramBodies.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const env = {
      TELEGRAM_FORCE_PUBLISH: "true",
      TELEGRAM_BOT_TOKEN: "test-token",
      TELEGRAM_CHANNEL_GOLD: "@gold",
      TELEGRAM_CHANNEL_EUR: "@eur",
      TELEGRAM_CHANNEL_USD: "@usd",
      TELEGRAM_CHANNEL_USDT: "@usdt",
      NEXT_PUBLIC_SITE_URL: "https://qeymat.test",
      TELEGRAM_MAIN_CHANNEL_URL: "https://t.me/qeymat",
    };
    const result = await publish(env, new Date("2026-10-08T05:30:00Z"));
    assert.deepEqual(result, { skipped: false, sent: 4 });
    assert.equal(telegramBodies.length, 4);
    assert.deepEqual(telegramBodies.map((body) => body.chat_id), ["@gold", "@eur", "@usd", "@usdt"]);
    assert.match(telegramBodies[0].photo, /s=GOLD18/);
    assert.match(telegramBodies[3].photo, /s=USDT/);
    assert.equal(telegramBodies[0].reply_markup.inline_keyboard[0].length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
