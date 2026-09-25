/**
 * تولید آیکون‌های PWA، فاوآیکون و لوگوی SVG از روی نشان برند (Q).
 *
 *   npm run icons:generate
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

/** هندسه‌ی نشان در جعبه‌ی ۶۴×۶۴ — همان که در components/layout/Brand.tsx است */
export const MARK = {
  ring: "M45.86 37.90 A17.5 17.5 0 1 0 29.39 47.99 L29.65 40.49 A10 10 0 1 1 39.06 34.73 Z",
  stem: "M28.39 47.88 L28.39 34.30 L29.39 33.70 L35.79 28.90 L35.79 47.01 A17.5 17.5 0 0 1 28.39 47.88 Z",
  dot: { x: 41.2, y: 43.2, size: 6.2, rx: 1.3 },
};

const DEFS = `<defs>
    <linearGradient id="qb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#11443a"/><stop offset="1" stop-color="#072019"/>
    </linearGradient>
    <radialGradient id="qg" cx=".78" cy=".14" r=".75">
      <stop offset="0" stop-color="#8fd8b8" stop-opacity=".28"/><stop offset="1" stop-color="#8fd8b8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="qc" gradientUnits="userSpaceOnUse" x1="0" y1="12" x2="0" y2="49">
      <stop offset="0" stop-color="#fbf8f0"/><stop offset="1" stop-color="#e9e3d3"/>
    </linearGradient>
    <linearGradient id="qm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#aef0cf"/><stop offset="1" stop-color="#6fc9a0"/>
    </linearGradient>
  </defs>`;

const glyph = `<path d="${MARK.ring}" fill="url(#qc)"/>
  <path d="${MARK.stem}" fill="url(#qc)"/>
  <rect x="${MARK.dot.x}" y="${MARK.dot.y}" width="${MARK.dot.size}" height="${MARK.dot.size}" rx="${MARK.dot.rx}" fill="url(#qm)"/>`;

/** آیکون با گوشه‌ی گرد */
function markSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="قیمت">
  <title>قیمت</title>
  ${DEFS}
  <rect width="64" height="64" rx="15" fill="url(#qb)"/>
  <rect width="64" height="64" rx="15" fill="url(#qg)"/>
  ${glyph}
</svg>`;
}

/** نسخه‌ی maskable: پس‌زمینه‌ی تمام‌قد و نشان در ناحیه‌ی امن ۸۰٪ */
function maskableSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-8 -8 80 80">
  ${DEFS}
  <rect x="-8" y="-8" width="80" height="80" fill="url(#qb)"/>
  <rect x="-8" y="-8" width="80" height="80" fill="url(#qg)"/>
  ${glyph}
</svg>`;
}

/** تصویر اشتراک‌گذاری (Open Graph) */
function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${DEFS}
  <rect width="1200" height="630" fill="url(#qb)"/>
  <rect width="1200" height="630" fill="url(#qg)"/>
  <g transform="translate(470 135) scale(4.2)">${glyph}</g>
  <text x="600" y="520" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="46" font-weight="700" fill="#f3efe5">qeymat.online</text>
</svg>`;
}

/** فایل ICO با تصاویر PNG داخلی (پشتیبانی همه‌ی مرورگرهای امروزی) */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

const targets = [
  { file: "icon-192.png", svg: markSvg(192) },
  { file: "icon-256.png", svg: markSvg(256) },
  { file: "icon-384.png", svg: markSvg(384) },
  { file: "icon-512.png", svg: markSvg(512) },
  { file: "icon-maskable-512.png", svg: maskableSvg(512) },
  { file: "apple-touch-icon.png", svg: maskableSvg(180) },
  { file: "favicon-32.png", svg: markSvg(32) },
  { file: "favicon-16.png", svg: markSvg(16) },
  { file: "og.png", svg: ogSvg() },
];

await mkdir(publicDir, { recursive: true });

for (const target of targets) {
  await writeFile(path.join(publicDir, target.file), await png(target.svg));
  console.log(`✓ ${target.file}`);
}

await writeFile(path.join(publicDir, "logo.svg"), markSvg(64));
console.log("✓ logo.svg");

await writeFile(
  path.join(publicDir, "favicon.ico"),
  ico([
    { size: 16, data: await png(markSvg(16)) },
    { size: 32, data: await png(markSvg(32)) },
    { size: 48, data: await png(markSvg(48)) },
  ]),
);
console.log("✓ favicon.ico");
