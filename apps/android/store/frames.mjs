/**
 * قاب تصویرهای فروشگاه (بازار و مایکت): تیتر فارسی + صفحه‌ی برنامه در قاب گوشی.
 *
 * ورودی: تصویرهای خام StoreShotsTest در apps/android/app/build/store-raw
 * خروجی: apps/android/store/screenshots/*.png (۱۰۸۰×۱۹۲۰)
 *
 *   node apps/android/store/frames.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const require = createRequire(path.join(root, "apps/web/package.json"));
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");

const fonts = path.join(root, "apps/web/assets/fonts");
GlobalFonts.registerFromPath(path.join(fonts, "Vazirmatn-Regular.ttf"), "VazirR");
GlobalFonts.registerFromPath(path.join(fonts, "Vazirmatn-Bold.ttf"), "VazirB");
GlobalFonts.registerFromPath(path.join(fonts, "Vazirmatn-ExtraBold.ttf"), "VazirX");

const raw = path.join(root, "apps/android/app/build/store-raw");
const out = path.join(here, "screenshots");
mkdirSync(out, { recursive: true });

const W = 1080;
const H = 1920;

const DARK = { top: "#123329", bottom: "#07130F", glow: "rgba(79,214,164,0.22)", title: "#F1ECE0", sub: "#9FB5A9", accent: "#D8B56C" };
const LIGHT = { top: "#FFFFFF", bottom: "#E6EEE7", glow: "rgba(14,154,105,0.16)", title: "#15241D", sub: "#4E6158", accent: "#A67B26" };

function background(ctx, theme) {
  const gradient = ctx.createLinearGradient(0, 0, W * 0.4, H);
  gradient.addColorStop(0, theme.top);
  gradient.addColorStop(1, theme.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, 260, 0, W * 0.8, 260, 700);
  glow.addColorStop(0, theme.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function headline(ctx, theme, title, sub, badge) {
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  if (badge) {
    ctx.font = "30px VazirB";
    const width = ctx.measureText(badge).width + 56;
    roundRect(ctx, (W - width) / 2, 58, width, 56, 28);
    ctx.fillStyle = theme === LIGHT ? "rgba(166,123,38,0.14)" : "rgba(216,181,108,0.16)";
    ctx.fill();
    ctx.fillStyle = theme.accent;
    ctx.fillText(badge, W / 2, 98);
  }
  ctx.fillStyle = theme.title;
  ctx.font = "74px VazirX";
  ctx.fillText(title, W / 2, 205);
  ctx.fillStyle = theme.sub;
  ctx.font = "36px VazirR";
  ctx.fillText(sub, W / 2, 268);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** قاب گوشی؛ صفحه از پایین بیرون می‌زند تا تصویر بزرگ‌تر دیده شود */
async function phone(ctx, image, { top = 320, width = 740 } = {}) {
  const bezel = 16;
  const screenW = width - bezel * 2;
  const screenH = Math.round((image.height * screenW) / image.width);
  const x = (W - width) / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  roundRect(ctx, x, top, width, screenH + bezel * 2, 78);
  ctx.fillStyle = "#050B08";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x + bezel, top + bezel, screenW, screenH, 64);
  ctx.clip();
  ctx.drawImage(image, x + bezel, top + bezel, screenW, screenH);
  ctx.restore();
}

async function framed(file, name, theme, title, sub, badge) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  background(ctx, theme);
  headline(ctx, theme, title, sub, badge);
  await phone(ctx, await loadImage(path.join(raw, file)));
  await writeFile(path.join(out, name), canvas.toBuffer("image/png"));
}

/** ویجت‌ها روی صفحه‌ی اصلی یک گوشی */
async function widgets(name) {
  const theme = DARK;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  background(ctx, theme);
  headline(ctx, theme, "ویجت صفحه‌ی اصلی", "قیمت‌ها بدون باز کردن برنامه، فارسی و راست‌به‌چپ", "تازه");

  // صفحه‌ی اصلی ساختگی با والپیپر نرم
  const screen = createCanvas(1179, 2556);
  const s = screen.getContext("2d");
  const wall = s.createLinearGradient(0, 0, 1179, 2556);
  wall.addColorStop(0, "#F3C7A6");
  wall.addColorStop(0.45, "#C9B6E8");
  wall.addColorStop(1, "#7FB7E6");
  s.fillStyle = wall;
  s.fillRect(0, 0, 1179, 2556);
  const prices = await loadImage(path.join(raw, "widget-prices-dark.png"));
  const dollarDark = await loadImage(path.join(raw, "widget-dollar-dark.png"));
  const dollarLight = await loadImage(path.join(raw, "widget-dollar-light.png"));
  const pw = 1060;
  const ph = Math.round((prices.height * pw) / prices.width);
  const shadow = () => {
    s.shadowColor = "rgba(0,0,0,0.25)";
    s.shadowBlur = 40;
    s.shadowOffsetY = 14;
  };
  s.save();
  shadow();
  s.drawImage(prices, 60, 300, pw, ph);
  const dw = 500;
  s.drawImage(dollarLight, 60, 300 + ph + 60, dw, dw);
  s.drawImage(dollarDark, 1179 - 60 - dw, 300 + ph + 60, dw, dw);
  s.restore();
  // ردیف آیکون‌های پایین صفحه
  const dock = 2556 - 330;
  const colors = ["#34C759", "#0A84FF", "#FF9F0A", "#FF375F"];
  colors.forEach((color, index) => {
    const size = 170;
    const gap = (1179 - 4 * size) / 5;
    roundRect(s, gap + index * (size + gap), dock, size, size, 48);
    s.fillStyle = color;
    s.fill();
  });

  await phone(ctx, screen);
  await writeFile(path.join(out, name), canvas.toBuffer("image/png"));
}

await framed("1-home.png", "1-home.png", DARK, "دلار، طلا و سکه، لحظه‌ای", "نرخ قابل اعتماد از چند منبع، در یک نگاه", "قیمت");
await framed("3-detail.png", "2-detail.png", DARK, "نمودار و نرخ‌های مرتبط", "از یک روز تا همه‌ی سال‌ها، کنار فردایی و هرات");
await widgets("3-widgets.png");
await framed("2-edit.png", "4-edit.png", DARK, "صفحه‌ی اول، به سلیقه‌ی تو", "منتخب‌ها را بچین و نرخ ویژه را انتخاب کن");
await framed("4-convert.png", "5-convert.png", DARK, "تبدیل در یک لحظه", "ارز، طلا، سکه و کریپتو به هر واحدی");
await framed("5-light-gold.png", "6-light.png", LIGHT, "پوسته‌ی روشن و تاریک", "هر طور که چشمت راحت‌تر است");
console.log("ok", out);
