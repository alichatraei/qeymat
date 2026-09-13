/**
 * تولید آیکون‌های PWA، فاوآیکون و تصویر OG از روی نشان برند.
 *
 *   node scripts/generate-icons.mjs
 *
 * خروجی‌ها در apps/web/public نوشته می‌شوند. این اسکریپت فقط هنگام
 * تغییر لوگو لازم است؛ خروجی‌ها در ریپو کامیت شده‌اند.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "..", "apps", "web", "public");

const GREEN_START = "#12a873";
const GREEN_END = "#07734d";

function markSvg(size, { rounded = true, background = true } = {}) {
  const radius = rounded ? size * 0.25 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GREEN_START}"/>
      <stop offset="1" stop-color="${GREEN_END}"/>
    </linearGradient>
  </defs>
  ${background ? `<rect width="64" height="64" rx="${(radius / size) * 64}" fill="url(#g)"/>` : ""}
  <rect x="15" y="36" width="7" height="13" rx="3.5" fill="#fff" opacity=".55"/>
  <rect x="28.5" y="29" width="7" height="20" rx="3.5" fill="#fff" opacity=".78"/>
  <rect x="42" y="20" width="7" height="29" rx="3.5" fill="#fff"/>
  <circle cx="45.5" cy="14" r="4" fill="#fff"/>
  <circle cx="45.5" cy="14" r="7.5" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2"/>
</svg>`;
}

/** نسخه‌ی maskable با حاشیه‌ی امن ۲۰٪ */
function maskableSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GREEN_START}"/>
      <stop offset="1" stop-color="${GREEN_END}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <g transform="translate(18 18) scale(1.03)">
    <rect x="15" y="36" width="7" height="13" rx="3.5" fill="#fff" opacity=".55"/>
    <rect x="28.5" y="29" width="7" height="20" rx="3.5" fill="#fff" opacity=".78"/>
    <rect x="42" y="20" width="7" height="29" rx="3.5" fill="#fff"/>
    <circle cx="45.5" cy="14" r="4" fill="#fff"/>
    <circle cx="45.5" cy="14" r="7.5" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2"/>
  </g>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, svg: markSvg(192) },
  { file: "icon-256.png", size: 256, svg: markSvg(256) },
  { file: "icon-384.png", size: 384, svg: markSvg(384) },
  { file: "icon-512.png", size: 512, svg: markSvg(512) },
  { file: "icon-maskable-512.png", size: 512, svg: maskableSvg(512) },
  { file: "apple-touch-icon.png", size: 180, svg: markSvg(180) },
  { file: "favicon-32.png", size: 32, svg: markSvg(32) },
  { file: "favicon-16.png", size: 16, svg: markSvg(16) },
];

await mkdir(publicDir, { recursive: true });

for (const target of targets) {
  const buffer = await sharp(Buffer.from(target.svg)).png().toBuffer();
  await writeFile(path.join(publicDir, target.file), buffer);
  console.log(`✓ ${target.file}`);
}

console.log("آیکون‌ها ساخته شدند. برای favicon.ico از favicon-32.png استفاده می‌شود.");
