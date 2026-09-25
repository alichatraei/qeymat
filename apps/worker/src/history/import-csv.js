#!/usr/bin/env node
/**
 * روش ۳ — درون‌ریزی تاریخچه از فایل CSV.
 *
 * برای دارایی‌هایی که TGJU آرشیوشان را ندارد (دلار هرات، فردایی، …) یا برای
 * اصلاح دستی یک بازه. هر ردیف یک روز است و قیمت‌ها **تومانی** هستند:
 *
 *   symbol,date,close,open,high,low
 *   USD,1403/05/12,58250,58000,58600,57900
 *   USD_HERAT,2024-08-02,57100
 *
 * - تاریخ شمسی (1403/05/12) و میلادی (2024-08-02) هر دو پذیرفته می‌شوند.
 * - open/high/low اختیاری‌اند؛ اگر نباشند برابر close گرفته می‌شوند.
 * - اگر ستون symbol نباشد، نماد با --symbol داده می‌شود.
 * - ردیف‌های موجود بازنویسی می‌شوند، جز کندل‌هایی که از نرخ زنده‌ی خودمان
 *   ساخته شده‌اند (مگر با --overwrite-live).
 *
 * اجرا:
 *   npm run history:import --workspace=@qeymat/worker -- ./usd.csv
 *   docker compose -f docker/docker-compose.yml exec worker \
 *     node apps/worker/src/history/import-csv.js /data/usd.csv --symbol USD
 */
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseAnyDay } from "../lib/time.js";
import { isSaneHistory, toNumber } from "../lib/parse-fa.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

export async function importCsv(text, { symbol: fixedSymbol, overwriteLive = false } = {}) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { imported: 0, skipped: 0, errors: ["فایل خالی است"] };

  const header = split(lines[0]).map((cell) => cell.toLowerCase());
  const hasHeader = header.includes("date") || header.includes("close");
  const columns = hasHeader
    ? header
    : fixedSymbol
      ? ["date", "close", "open", "high", "low"]
      : ["symbol", "date", "close", "open", "high", "low"];
  const body = hasHeader ? lines.slice(1) : lines;

  const assets = await prisma.asset.findMany({ select: { id: true, symbol: true } });
  const idBySymbol = new Map(assets.map((asset) => [asset.symbol, asset.id]));

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const [index, line] of body.entries()) {
    const cells = split(line);
    const row = Object.fromEntries(columns.map((column, i) => [column, cells[i]]));
    const symbol = String(row.symbol || fixedSymbol || "").toUpperCase();
    const assetId = idBySymbol.get(symbol);
    const day = parseAnyDay(row.date || "");
    const close = toNumber(row.close);

    if (!assetId || !day || !close) {
      skipped += 1;
      if (errors.length < 20) errors.push(`ردیف ${index + 1}: نماد، تاریخ یا قیمت نامعتبر`);
      continue;
    }
    if (!isSaneHistory(symbol, close)) {
      skipped += 1;
      if (errors.length < 20) errors.push(`ردیف ${index + 1}: ${close} برای ${symbol} منطقی نیست (تومان؟)`);
      continue;
    }

    const open = toNumber(row.open) || close;
    const high = Math.max(toNumber(row.high) || close, open, close);
    const low = Math.min(toNumber(row.low) || close, open, close);

    const existing = await prisma.rateDaily.findUnique({
      where: { assetId_day: { assetId, day } },
      select: { source: true },
    });
    if (existing?.source === "live" && !overwriteLive) {
      skipped += 1;
      continue;
    }

    await prisma.rateDaily.upsert({
      where: { assetId_day: { assetId, day } },
      update: { open, high, low, close, source: "csv" },
      create: { assetId, day, open, high, low, close, source: "csv" },
    });
    imported += 1;
  }

  return { imported, skipped, errors };
}

function split(line) {
  return line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

// اجرای مستقیم از خط فرمان
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const args = process.argv.slice(2);
  const symbolIndex = args.indexOf("--symbol");
  const symbol = symbolIndex >= 0 ? args[symbolIndex + 1] : undefined;
  const file = args.find((arg, i) => !arg.startsWith("--") && (symbolIndex < 0 || i !== symbolIndex + 1));

  if (!file) {
    console.error("استفاده: import-csv.js <file.csv> [--symbol USD] [--overwrite-live]");
    process.exit(1);
  }

  const text = await fs.readFile(file, "utf8");
  const result = await importCsv(text, {
    symbol,
    overwriteLive: args.includes("--overwrite-live"),
  });
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}
