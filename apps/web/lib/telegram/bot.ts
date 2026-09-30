import "server-only";
import { getSnapshot } from "@/lib/market";
import type { RateView } from "@/lib/types";
import {
  BOT_USERNAME,
  HELP,
  SITE,
  categoryList,
  conversionCaption,
  convert,
  priceCaption,
  priceText,
} from "./format";
import { buildAliases, parseMessage, type Parsed } from "./parse";

/**
 * ربات تلگرام «قیمت».
 *
 * سرور در ایران است و به api.telegram.org دسترسی ندارد؛ ولی تلگرام از طریق
 * Cloudflare به qeymat.online می‌رسد. پس پاسخ هر پیام در همان پاسخ webhook
 * برگردانده می‌شود (تلگرام اجازه می‌دهد بدنه‌ی پاسخ webhook یک متد باشد) و
 * تصویر فقط به‌صورت نشانی فرستاده می‌شود تا خود تلگرام دانلودش کند.
 * نتیجه: ربات هیچ درخواست خروجی به تلگرام ندارد.
 */

type Chat = { id: number; type: "private" | "group" | "supergroup" | "channel" };
type Update = {
  message?: { message_id: number; text?: string; chat: Chat };
  inline_query?: { id: string; query: string };
};
export type BotReply = Record<string, unknown> | null;

const KEYBOARD_TEXT: Record<string, string> = {
  "💵 ارزها": "CURRENCY",
  "🟡 طلا و سکه": "GOLD",
  "🪙 رمزارز": "CRYPTO",
  "🛢 کالا و فلزات": "COMMODITY",
};
const COMMANDS: Record<string, string> = {
  "/arz": "CURRENCY",
  "/currencies": "CURRENCY",
  "/gold": "GOLD",
  "/tala": "GOLD",
  "/crypto": "CRYPTO",
  "/commodities": "COMMODITY",
  "/kala": "COMMODITY",
};
const INLINE_DEFAULTS = ["USD", "EUR", "GOLD18", "EMAMI", "USDT", "BTC", "BRENT"];

/** نسخه‌ی دقیقه‌ای در نشانی تصویر؛ تلگرام تصویر هر نشانی را کش می‌کند */
const version = () => Math.floor(Date.now() / 60000);

export function priceImageUrl(symbol: string) {
  return `${SITE}/api/telegram/card?s=${encodeURIComponent(symbol)}&v=${version()}`;
}

export function conversionImageUrl(amount: number, from: string, to: string) {
  const params = new URLSearchParams({ a: String(amount), f: from, t: to, v: String(version()) });
  return `${SITE}/api/telegram/card?${params}`;
}

async function context() {
  const snapshot = await getSnapshot();
  const bySymbol = new Map(snapshot.assets.map((asset) => [asset.symbol, asset]));
  return { assets: snapshot.assets, bySymbol, aliases: buildAliases(snapshot.assets) };
}

/** دکمه‌های زیر عکس: سایت و «ارسال برای دیگران» (حالت inline) */
function buttons(chat: Chat | null, url: string, share?: string) {
  const row: Record<string, unknown>[] = [{ text: "📈 نمودار و جزئیات", url }];
  if (share && BOT_USERNAME) row.push({ text: "↗️ ارسال برای دیگران", switch_inline_query: share });
  const rows = [row];
  // دکمه‌ی مینی‌اپ فقط در گفت‌وگوی خصوصی مجاز است
  if (chat?.type === "private") rows.push([{ text: "📱 باز کردن اپ قیمت", web_app: { url: SITE } }]);
  return { inline_keyboard: rows };
}

function answer(parsed: Parsed, bySymbol: Map<string, RateView>, chat: Chat | null, query: string) {
  if (parsed.kind === "price") {
    const rate = bySymbol.get(parsed.symbol);
    if (!rate) return null;
    return {
      photo: priceImageUrl(rate.symbol),
      caption: priceCaption(rate, bySymbol),
      title: `${rate.nameFa}: ${priceText(rate)} ${rate.unit === "USD" ? "دلار" : "تومان"}`,
      markup: buttons(chat, `${SITE}/chart?symbol=${rate.symbol}`, query),
    };
  }
  const conversion = convert(parsed.amount, parsed.from, parsed.to, bySymbol);
  if (!conversion) return null;
  const caption = conversionCaption(conversion);
  const fromSymbol = parsed.from === "IRT" || parsed.from === "IRR" ? parsed.to : parsed.from;
  return {
    photo: conversionImageUrl(parsed.amount, parsed.from, parsed.to),
    caption,
    title: caption.split("\n").filter(Boolean).slice(0, 2).join(" "),
    markup: buttons(chat, `${SITE}/converter?symbol=${fromSymbol}`, query),
  };
}

export async function handleUpdate(update: Update): Promise<BotReply> {
  if (update.inline_query) return inline(update.inline_query);

  const message = update.message;
  if (!message?.text) return null;
  const chat = message.chat;
  const isPrivate = chat.type === "private";
  // «/price@QeymatBot» و منشن ربات در گروه
  const text = message.text.replace(new RegExp(`@${BOT_USERNAME || "_"}\\b`, "gi"), "").trim();
  const command = text.split(/\s+/)[0].toLowerCase();
  const reply = (fields: Record<string, unknown>) => ({ chat_id: chat.id, ...fields });

  if (command === "/start" || command === "/help") {
    return {
      method: "sendMessage",
      ...reply({
        text: HELP,
        reply_markup: isPrivate
          ? {
              keyboard: [
                [{ text: "💵 ارزها" }, { text: "🟡 طلا و سکه" }],
                [{ text: "🪙 رمزارز" }, { text: "🛢 کالا و فلزات" }],
                [{ text: "📱 باز کردن اپ قیمت", web_app: { url: SITE } }],
              ],
              resize_keyboard: true,
              is_persistent: true,
            }
          : undefined,
      }),
    };
  }

  const { assets, bySymbol, aliases } = await context();

  const category = KEYBOARD_TEXT[text] ?? COMMANDS[command];
  if (category) {
    const list = categoryList(category, assets);
    return list ? { method: "sendMessage", ...reply({ text: list, disable_web_page_preview: true }) } : null;
  }

  // «/usd» و «/price دلار» هم مثل نوشتن نام کار می‌کنند
  const query = text.replace(/^\/(price|p)\s*/i, "").replace(/^\//, "");
  const parsed = parseMessage(query, aliases);
  const result = parsed ? answer(parsed, bySymbol, chat, query) : null;
  if (!result) {
    // در گروه فقط وقتی جواب می‌دهیم که پیام را فهمیده باشیم
    return isPrivate
      ? { method: "sendMessage", ...reply({ text: `متوجه نشدم 🤔\n\n${HELP}` }) }
      : null;
  }

  return {
    method: "sendPhoto",
    ...reply({
      photo: result.photo,
      caption: result.caption,
      reply_markup: result.markup,
      reply_to_message_id: isPrivate ? undefined : message.message_id,
    }),
  };
}

/** حالت inline: «@QeymatBot ۱۰ دلار» در هر گفت‌وگو */
async function inline(query: { id: string; query: string }): Promise<BotReply> {
  const { bySymbol, aliases } = await context();
  const text = query.query.trim();
  const parsed = text ? parseMessage(text, aliases) : null;

  const items = parsed
    ? [answer(parsed, bySymbol, null, text)].filter(Boolean)
    : INLINE_DEFAULTS.map((symbol) => answer({ kind: "price", symbol }, bySymbol, null, symbol)).filter(Boolean);

  const results = items.flatMap((item, index) => [
    {
      type: "photo",
      id: `p${index}-${Date.now() % 100000}`,
      photo_url: item!.photo,
      thumbnail_url: item!.photo,
      photo_width: 1200,
      photo_height: 675,
      title: item!.title,
      caption: item!.caption,
      reply_markup: item!.markup,
    },
    // نسخه‌ی متنی برای کسی که فقط متن می‌خواهد
    ...(parsed
      ? [
          {
            type: "article",
            id: `t${index}-${Date.now() % 100000}`,
            title: `📝 ${item!.title}`,
            description: "ارسال به‌صورت متن",
            input_message_content: { message_text: item!.caption, disable_web_page_preview: true },
            reply_markup: item!.markup,
          },
        ]
      : []),
  ]);

  return {
    method: "answerInlineQuery",
    inline_query_id: query.id,
    results,
    cache_time: 30,
    is_personal: false,
  };
}
