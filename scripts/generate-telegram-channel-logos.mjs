import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, "apps/web/public/telegram/channels");
const font = path.join(root, "apps/web/assets/fonts/Vazirmatn-Bold.ttf");

const logos = [
  { slug: "gold", label: "طلا", accent: "#F5C451", kind: "gold" },
  { slug: "eur", label: "یورو", accent: "#70B7FF", symbol: "€" },
  { slug: "usd", label: "دلار", accent: "#8FD8B8", symbol: "$" },
  { slug: "usdt", label: "تتر", accent: "#26A17B", symbol: "₮" },
];

const qMark = `
  <g transform="translate(218 38) scale(1.2)">
    <path d="M45.86 37.90 A17.5 17.5 0 1 0 29.39 47.99 L29.65 40.49 A10 10 0 1 1 39.06 34.73 Z" fill="url(#cream)"/>
    <path d="M28.39 47.88 L28.39 34.30 L29.39 33.70 L35.79 28.90 L35.79 47.01 A17.5 17.5 0 0 1 28.39 47.88 Z" fill="url(#cream)"/>
    <rect x="41.2" y="43.2" width="6.2" height="6.2" rx="1.3" fill="#8fd8b8"/>
  </g>`;

function assetMark(item) {
  if (item.kind !== "gold") {
    return `<text x="256" y="326" text-anchor="middle" font-family="Arial, sans-serif" font-size="216" font-weight="800" fill="${item.accent}">${item.symbol}</text>`;
  }
  return `
    <g transform="translate(0 -30)" fill="${item.accent}" stroke="#FFF4CB" stroke-width="5" stroke-linejoin="round">
      <path d="M169 293 204 237h104l35 56-35 56H204z"/>
      <path d="M112 344 147 288h104l35 56-35 56H147z"/>
      <path d="M226 344 261 288h104l35 56-35 56H261z"/>
    </g>
    <path d="M218 229h76" stroke="#8B6415" stroke-width="10" stroke-linecap="round" opacity=".55"/>`;
}

function svg(item) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512" role="img" aria-label="قیمت ${item.label} لحظه‌ای">
  <title>قیمت ${item.label} لحظه‌ای</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#145448"/><stop offset="1" stop-color="#061F19"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".43" r=".55">
      <stop offset="0" stop-color="${item.accent}" stop-opacity=".28"/><stop offset="1" stop-color="${item.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFDF7"/><stop offset="1" stop-color="#E9E3D3"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect width="512" height="512" rx="112" fill="url(#glow)"/>
  ${qMark}
  <circle cx="256" cy="268" r="142" fill="#FFFFFF" opacity=".035" stroke="${item.accent}" stroke-opacity=".28" stroke-width="3"/>
  ${assetMark(item)}
</svg>`;
}

await mkdir(output, { recursive: true });
GlobalFonts.registerFromPath(font, "Vazirmatn");

for (const item of logos) {
  const source = svg(item);
  const pngPath = path.join(output, `${item.slug}.png`);

  const image = await loadImage(Buffer.from(source));
  const canvas = createCanvas(1024, 1024);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, 1024, 1024);
  context.textAlign = "center";
  context.direction = "rtl";
  context.fillStyle = "#FBF8F0";
  context.font = "700 104px Vazirmatn";
  context.fillText(item.label, 512, 866);
  context.fillStyle = "#8FD8B8";
  context.font = "700 48px Vazirmatn";
  context.fillText("قیمت لحظه‌ای", 512, 942);
  await writeFile(pngPath, canvas.toBuffer("image/png"));
  console.log(`✓ ${path.relative(root, pngPath)}`);
}

const preview = createCanvas(1060, 1060);
const previewContext = preview.getContext("2d");
previewContext.fillStyle = "#F2EFE7";
previewContext.fillRect(0, 0, 1060, 1060);
for (const [index, item] of logos.entries()) {
  const image = await loadImage(path.join(output, `${item.slug}.png`));
  const x = 20 + (index % 2) * 520;
  const y = 20 + Math.floor(index / 2) * 520;
  previewContext.drawImage(image, x, y, 500, 500);
}
const previewPath = path.join(output, "preview.png");
await writeFile(previewPath, preview.toBuffer("image/png"));
console.log(`✓ ${path.relative(root, previewPath)}`);
