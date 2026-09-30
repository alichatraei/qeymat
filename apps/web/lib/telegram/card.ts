import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createCanvas, GlobalFonts, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import * as FlagSvgs from "country-flag-icons/string/3x2";
import { isValidElement, type ReactNode } from "react";
import { fa } from "@qeymat/shared";
import { assetArtContent } from "@/components/market/AssetArt";
import type { HistoryPoint, RateView } from "@/lib/types";
import { BOT_USERNAME, type Conversion, amountText, priceText, stampText } from "./format";

/**
 * تصویر قیمت و تبدیل برای ربات تلگرام (۱۲۰۰×۶۷۵، JPEG).
 *
 * با @napi-rs/canvas (Skia + HarfBuzz) کشیده می‌شود تا حروف فارسی درست به هم
 * بچسبند؛ satori و resvg شکل‌دهی عربی/فارسی ندارند. فونت‌ها TTF وزیرمتن در
 * apps/web/assets/fonts هستند (Dockerfile آن‌ها را کنار server.js کپی می‌کند).
 */
const W = 1200;
const H = 675;

const FONT = { regular: "QeymatR", bold: "QeymatB", heavy: "QeymatX" } as const;
let fontsReady = false;

function assetsDir(...parts: string[]) {
  // standalone پیش از اجرا به پوشه‌ی apps/web می‌رود؛ در توسعه هم همان‌جاست
  for (const base of [process.cwd(), path.join(process.cwd(), "apps/web")]) {
    const candidate = path.join(base, ...parts);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(process.cwd(), ...parts);
}

function ensureFonts() {
  if (fontsReady) return;
  GlobalFonts.registerFromPath(assetsDir("assets/fonts/Vazirmatn-Regular.ttf"), FONT.regular);
  GlobalFonts.registerFromPath(assetsDir("assets/fonts/Vazirmatn-Bold.ttf"), FONT.bold);
  GlobalFonts.registerFromPath(assetsDir("assets/fonts/Vazirmatn-ExtraBold.ttf"), FONT.heavy);
  fontsReady = true;
}

const font = (weight: keyof typeof FONT, size: number) => `${size}px ${FONT[weight]}`;

let logo: Promise<Image | null> | null = null;
function loadLogo() {
  logo ??= fs.promises
    .readFile(assetsDir("public/icon-192.png"))
    .then((buffer) => loadImage(buffer))
    .catch(() => null);
  return logo;
}

async function flagImage(countryCode?: string | null) {
  const svg = countryCode ? (FlagSvgs as Record<string, string>)[countryCode.toUpperCase()] : null;
  return svg ? loadImage(Buffer.from(svg)) : null;
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** زمینه: پرچم محو برای ارز، گرادیان برند برای بقیه */
async function background(ctx: SKRSContext2D, countryCode?: string | null) {
  const flag = await flagImage(countryCode);
  if (flag) {
    // کوچک کشیدن و بزرگ کردن دوباره، محوشدگی نرم و بی‌وابستگی می‌دهد
    const tiny = createCanvas(48, 27);
    const t = tiny.getContext("2d");
    t.drawImage(flag, 0, 0, 48, 27);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tiny, 0, 0, W, H);
    ctx.fillStyle = "rgba(10, 30, 24, .18)";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#11443a");
  gradient.addColorStop(1, "#06120d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, 60, 0, W * 0.85, 60, 700);
  glow.addColorStop(0, "rgba(143,216,184,.25)");
  glow.addColorStop(1, "rgba(143,216,184,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

/** کارت شیشه‌ای وسط تصویر */
function panel(ctx: SKRSContext2D) {
  const box = { x: 80, y: 56, w: W - 160, h: 520 };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.18)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, box.x, box.y, box.w, box.h, 48);
  ctx.fillStyle = "rgba(255,255,255,.93)";
  ctx.fill();
  ctx.restore();
  return box;
}

async function footer(ctx: SKRSContext2D) {
  const text = BOT_USERNAME ? `qeymat.online  |  @${BOT_USERNAME}  ·  ${stampText()}` : `qeymat.online  ·  ${stampText()}`;
  ctx.font = font("bold", 26);
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  const width = ctx.measureText(text).width;
  const image = await loadLogo();
  const left = W / 2 - width / 2 - (image ? 22 : 0);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, W / 2 + (image ? 22 : 0), 632);
  ctx.restore();
  if (image) {
    ctx.save();
    roundRect(ctx, left - 26, 606, 36, 36, 9);
    ctx.clip();
    ctx.drawImage(image, left - 26, 606, 36, 36);
    ctx.restore();
  }
}

/**
 * درخت JSX ساده‌ی آواتار ← متن SVG. react-dom/server در مسیرهای app مجاز نیست
 * و آواتارها فقط عنصر SVG ثابت‌اند (بدون کامپوننت و hook)، پس همین کافی است.
 */
const KEEP_CASE = new Set(["viewBox", "gradientUnits", "gradientTransform"]);
/** نمادهایی که وزیرمتن ندارد و تصویر سرور فونت جایگزین ندارد */
const GLYPH: Record<string, string> = { "₿": "B", "₮": "T", "Ð": "D", "◎": "S", "✕": "X", "₳": "A" };
type Label = { text: string; x: number; y: number; size: number; fill: string };

function toSvg(node: ReactNode, labels: Label[]): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") {
    return String(node).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
  if (Array.isArray(node)) return node.map((child) => toSvg(child, labels)).join("");
  if (!isValidElement(node)) return "";
  const { children, ...props } = node.props as Record<string, unknown> & { children?: ReactNode };
  if (typeof node.type !== "string") return toSvg(children, labels); // Fragment
  // متن را خود canvas می‌کشد؛ رندر SVG اسکیا حروف فارسی را به هم نمی‌چسباند
  if (node.type === "text") {
    const text = [children].flat().join("");
    labels.push({
      text: GLYPH[text] ?? text,
      x: Number(props.x ?? 20),
      y: Number(props.y ?? 20),
      size: Number(props.fontSize ?? 8),
      fill: String(props.fill ?? "#fff"),
    });
    return "";
  }
  const attrs = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => {
      const name = key === "className" ? "class" : KEEP_CASE.has(key) ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      return `${name}="${String(value).replace(/"/g, "&quot;")}"`;
    })
    .join(" ");
  return `<${node.type}${attrs ? ` ${attrs}` : ""}>${toSvg(children, labels)}</${node.type}>`;
}

/** همان آواتار سایت: شکل‌ها از SVG، متن‌ها جدا برای کشیدن با canvas */
async function assetArtImage(symbol: string, size: number) {
  const content = assetArtContent(symbol, "a");
  if (!content) return null;
  const labels: Label[] = [];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}">${toSvg(content, labels)}</svg>`;
  const image = await loadImage(Buffer.from(svg)).catch(() => null);
  return image ? { image, labels } : null;
}

/** نشانه‌ی دارایی: پرچم یا آواتار سایت در دایره؛ در نبودشان دایره‌ی رنگی با نماد */
async function icon(ctx: SKRSContext2D, rate: Pick<RateView, "countryCode" | "symbol" | "category">, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const flag = await flagImage(rate.countryCode);
  const art = flag ? null : await assetArtImage(rate.symbol, r * 4);
  if (flag) {
    ctx.drawImage(flag, cx - r * 1.5, cy - r, r * 3, r * 2);
  } else if (art) {
    ctx.drawImage(art.image, cx - r, cy - r, r * 2, r * 2);
    const scale = (r * 2) / 40;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const label of art.labels) {
      ctx.font = font("heavy", label.size * scale);
      ctx.fillStyle = label.fill;
      ctx.direction = /[\u0600-\u06FF]/.test(label.text) ? "rtl" : "ltr";
      ctx.fillText(label.text, cx - r + label.x * scale, cy - r + label.y * scale);
    }
    ctx.textBaseline = "alphabetic";
  } else {
    const tone = rate.category === "GOLD" ? ["#FFE58A", "#B7841B"] : rate.category === "CRYPTO" ? ["#F7931A", "#B35F00"] : ["#1f6b58", "#0c332a"];
    const gradient = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    gradient.addColorStop(0, tone[0]);
    gradient.addColorStop(1, tone[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = rate.category === "GOLD" ? "#5a3d08" : "#ffffff";
    ctx.font = font("heavy", rate.symbol.length > 4 ? r * 0.42 : r * 0.55);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "ltr";
    ctx.fillText(rate.symbol.slice(0, 5), cx, cy + 2);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,.08)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function chip(ctx: SKRSContext2D, text: string, x: number, y: number) {
  ctx.font = font("heavy", 26);
  ctx.direction = "ltr";
  const width = ctx.measureText(text).width + 40;
  roundRect(ctx, x, y, width, 52, 26);
  ctx.fillStyle = "rgba(15,23,42,.07)";
  ctx.fill();
  ctx.fillStyle = "#9aa3ad";
  ctx.textAlign = "left";
  ctx.fillText(text, x + 20, y + 35);
}

/** نمودار ناحیه‌ای با محور قیمت سمت چپ */
function chart(ctx: SKRSContext2D, points: HistoryPoint[], area: { x: number; y: number; w: number; h: number }, up: boolean) {
  const values = points.map((point) => point.value);
  if (values.length < 2) return;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.12 || max * 0.01;
  const lo = min - pad;
  const hi = max + pad;
  const labelWidth = 120;
  const plot = { x: area.x + labelWidth, y: area.y, w: area.w - labelWidth, h: area.h };
  const xOf = (i: number) => plot.x + (i / (values.length - 1)) * plot.w;
  const yOf = (v: number) => plot.y + plot.h - ((v - lo) / (hi - lo)) * plot.h;

  // خطوط راهنما و برچسب‌ها
  ctx.font = font("bold", 20);
  ctx.textAlign = "left";
  ctx.direction = "ltr";
  for (let k = 0; k <= 4; k += 1) {
    const v = lo + ((hi - lo) * k) / 4;
    const y = yOf(v);
    ctx.strokeStyle = "rgba(15,23,42,.07)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillStyle = "#9aa3ad";
    ctx.fillText(v >= 1000 ? fa(Math.round(v)) : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(v), area.x, y + 7);
  }

  const color = up ? "#16a36a" : "#e0514b";
  const path = () => {
    ctx.beginPath();
    values.forEach((v, i) => (i ? ctx.lineTo(xOf(i), yOf(v)) : ctx.moveTo(xOf(i), yOf(v))));
  };
  path();
  ctx.lineTo(xOf(values.length - 1), plot.y + plot.h);
  ctx.lineTo(xOf(0), plot.y + plot.h);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.h);
  fill.addColorStop(0, up ? "rgba(22,163,106,.45)" : "rgba(224,81,75,.4)");
  fill.addColorStop(1, up ? "rgba(22,163,106,.03)" : "rgba(224,81,75,.03)");
  ctx.fillStyle = fill;
  ctx.fill();

  path();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  const lx = xOf(values.length - 1);
  const ly = yOf(values[values.length - 1]);
  ctx.beginPath();
  ctx.arc(lx, ly, 11, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

/** متن راست‌چین با کوچک شدن تا جا شدن در پهنا */
function rightText(ctx: SKRSContext2D, text: string, x: number, y: number, weight: keyof typeof FONT, size: number, color: string, maxWidth = 900) {
  let current = size;
  ctx.font = font(weight, current);
  while (ctx.measureText(text).width > maxWidth && current > 18) {
    current -= 2;
    ctx.font = font(weight, current);
  }
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  return ctx.measureText(text).width;
}

export async function priceCard(rate: RateView, points: HistoryPoint[]) {
  ensureFonts();
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  await background(ctx, rate.countryCode);
  const box = panel(ctx);
  const right = box.x + box.w - 56;

  await icon(ctx, rate, right - 34, box.y + 76, 34);
  rightText(ctx, rate.nameFa, right - 86, box.y + 92, "heavy", 42, "#1b2430", 600);
  chip(ctx, rate.unit === "USD" ? "USD" : "IRT", box.x + 50, box.y + 50);

  const price = priceText(rate);
  const priceWidth = rightText(ctx, price, right, box.y + 228, "heavy", 118, "#1b2430", 720);
  rightText(ctx, rate.unit === "USD" ? "دلار" : "تومان", right - priceWidth - 24, box.y + 222, "bold", 44, "#6b7480", 260);

  // درصد تغییر روز
  const up = rate.changePercent >= 0;
  const sign = rate.changePercent > 0 ? "+" : rate.changePercent < 0 ? "−" : "";
  const change = `${sign}٪${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(Math.abs(rate.changePercent))}`;
  ctx.font = font("heavy", 34);
  const pillWidth = ctx.measureText(change).width + 44;
  roundRect(ctx, right - pillWidth, box.y + 256, pillWidth, 58, 29);
  ctx.fillStyle = up ? "rgba(22,163,106,.13)" : "rgba(224,81,75,.13)";
  ctx.fill();
  rightText(ctx, change, right - 22, box.y + 297, "heavy", 34, up ? "#12885a" : "#c73e38");
  ctx.beginPath();
  const ax = right - pillWidth - 40;
  const ay = box.y + 285;
  ctx.arc(ax, ay, 26, 0, Math.PI * 2);
  ctx.fillStyle = up ? "rgba(22,163,106,.13)" : "rgba(224,81,75,.13)";
  ctx.fill();
  ctx.strokeStyle = up ? "#12885a" : "#c73e38";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // دو هشتی رو به بالا یا پایین (︽ / ︾)
  const dir = up ? -1 : 1;
  for (const offset of [-6, 6]) {
    const y = ay + offset;
    ctx.beginPath();
    ctx.moveTo(ax - 10, y - dir * 5);
    ctx.lineTo(ax, y + dir * 5);
    ctx.lineTo(ax + 10, y - dir * 5);
    ctx.stroke();
  }

  chart(ctx, points, { x: box.x + 36, y: box.y + 340, w: box.w - 92, h: 150 }, points.length > 1 ? points[points.length - 1].value >= points[0].value : up);
  await footer(ctx);
  return canvas.encode("jpeg", 90);
}

export async function conversionCard(conversion: Conversion, fromRate?: RateView) {
  ensureFonts();
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  await background(ctx, fromRate?.countryCode);
  const box = panel(ctx);
  const right = box.x + box.w - 56;

  if (fromRate) await icon(ctx, fromRate, right - 34, box.y + 76, 34);
  rightText(ctx, "تبدیل ارز", right - (fromRate ? 86 : 0), box.y + 92, "heavy", 40, "#1b2430", 600);
  // «→» در وزیرمتن نیست و تصویر سرور فونت جایگزین ندارد
  chip(ctx, `${conversion.from} > ${conversion.to}`, box.x + 50, box.y + 50);

  rightText(ctx, `${amountText(conversion.amount)} ${conversion.fromName} =`, right, box.y + 200, "bold", 48, "#4b5563", 960);
  const result = amountText(conversion.result);
  const resultWidth = rightText(ctx, result, right, box.y + 330, "heavy", 118, "#12885a", 700);
  rightText(ctx, conversion.toName, right - resultWidth - 24, box.y + 322, "bold", 44, "#6b7480", 300);
  rightText(ctx, conversion.rateLine, right, box.y + 430, "bold", 32, "#6b7480", 960);

  await footer(ctx);
  return canvas.encode("jpeg", 90);
}
