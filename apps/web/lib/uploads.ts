import "server-only";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * نگهداری فیش‌های واریزی روی دیسک.
 *
 * در داکر این پوشه یک volume دائمی است (docker-compose: receipts:/app/uploads)
 * تا با هر استقرار پاک نشود. فایل‌ها هرگز از مسیر عمومی سرو نمی‌شوند؛ فقط
 * صاحب فیش و مدیر از مسیر /api/receipts/[id]/file به آن‌ها دسترسی دارند.
 */
const ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const RECEIPTS = path.join(ROOT, "receipts");

export const MAX_RECEIPT_BYTES = 6 * 1024 * 1024;

/** نوع فایل از روی بایت‌های ابتدایی، نه نام یا هدر مرورگر */
function sniff(bytes: Buffer): { mime: string; ext: string } | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  if (bytes.length > 4 && bytes.toString("ascii", 0, 4) === "%PDF") return { mime: "application/pdf", ext: "pdf" };
  return null;
}

export async function saveReceipt(file: File): Promise<{ ok: true; name: string; mime: string } | { ok: false; message: string }> {
  if (file.size > MAX_RECEIPT_BYTES) return { ok: false, message: "حجم فایل فیش باید کمتر از ۶ مگابایت باشد." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return { ok: false, message: "فقط تصویر (JPG، PNG، WEBP) یا PDF فیش پذیرفته می‌شود." };

  await mkdir(RECEIPTS, { recursive: true });
  const name = `${crypto.randomUUID()}.${type.ext}`;
  await writeFile(path.join(RECEIPTS, name), bytes, { mode: 0o640 });
  return { ok: true, name, mime: type.mime };
}

export async function readReceipt(name: string): Promise<Buffer | null> {
  // فقط نام ساده‌ی فایل؛ هر مسیر نسبی رد می‌شود
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(name)) return null;
  return readFile(path.join(RECEIPTS, name)).catch(() => null);
}
