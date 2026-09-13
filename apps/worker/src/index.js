import http from "node:http";
import { createRequire } from "node:module";
import cron from "node-cron";
import { runSource, runAll, refreshCache } from "./crawler.js";
import { closeCache } from "./lib/cache.js";
import { log } from "./lib/log.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

const PORT = Number(process.env.WORKER_PORT || 4001);
const timers = new Map();
/** جلوگیری از همپوشانی اجراها وقتی منبع کند است */
const running = new Set();

async function tick(key) {
  if (running.has(key)) return;
  running.add(key);
  try {
    await runSource(key);
  } catch {
    /* خطا داخل runSource لاگ و ثبت شده است */
  } finally {
    running.delete(key);
  }
}

/** زمان‌بند را با فواصل تعریف‌شده در جدول Source می‌سازد. */
async function schedule() {
  for (const timer of timers.values()) clearInterval(timer);
  timers.clear();

  const sources = await prisma.source.findMany({ where: { isActive: true } });
  for (const source of sources) {
    const intervalMs = Math.max(15, source.intervalSec) * 1000;
    timers.set(source.key, setInterval(() => tick(source.key), intervalMs));
    log.info(`زمان‌بندی ${source.key} هر ${source.intervalSec} ثانیه`);
  }
}

/** پاک‌سازی تاریخچه‌ی قدیمی و لاگ مصرف */
async function cleanup() {
  const historyDays = Number(process.env.HISTORY_RETENTION_DAYS || 400);
  const usageDays = Number(process.env.USAGE_RETENTION_DAYS || 90);
  const cutoff = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [history, usage] = await Promise.all([
    prisma.rateHistory.deleteMany({ where: { at: { lt: cutoff(historyDays) } } }),
    prisma.usageLog.deleteMany({ where: { at: { lt: cutoff(usageDays) } } }),
  ]);
  log.info(`پاک‌سازی: ${history.count} تاریخچه، ${usage.count} لاگ مصرف`);
}

/** بازنشانی شمارنده‌ی مصرف اشتراک‌های منقضی‌شده */
async function expireSubscriptions() {
  const result = await prisma.subscription.updateMany({
    where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  if (result.count) log.info(`${result.count} اشتراک منقضی شد`);
}

async function main() {
  log.info("کرالر قیمت در حال راه‌اندازی…");

  await prisma.$connect();
  await runAll().then((results) => log.info("اجرای اولیه:", JSON.stringify(results)));
  await schedule();

  // هر ۱۰ دقیقه زمان‌بندی را با تنظیمات پنل مدیریت همگام می‌کند
  cron.schedule("*/10 * * * *", () => schedule().catch((error) => log.error(error)));
  // نگهداشت شبانه، ۴ بامداد تهران
  cron.schedule("0 4 * * *", () => cleanup().catch((error) => log.error(error)), {
    timezone: "Asia/Tehran",
  });
  cron.schedule("*/30 * * * *", () => expireSubscriptions().catch((error) => log.error(error)));

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://localhost:${PORT}`);
    response.setHeader("Content-Type", "application/json; charset=utf-8");

    if (url.pathname === "/health") {
      const sources = await prisma.source.findMany({
        select: { key: true, status: true, lastFetchedAt: true, lastLatencyMs: true, lastError: true },
      });
      const healthy = sources.some((source) => source.status !== "DOWN");
      response.writeHead(healthy ? 200 : 503);
      response.end(JSON.stringify({ ok: healthy, sources }));
      return;
    }

    // اجرای دستی؛ فقط با توکن داخلی
    if (url.pathname === "/run" && request.method === "POST") {
      const token = request.headers["x-worker-token"];
      if (!process.env.WORKER_TOKEN || token !== process.env.WORKER_TOKEN) {
        response.writeHead(401);
        response.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
      const key = url.searchParams.get("source");
      try {
        const result = key ? await runSource(key) : await runAll();
        response.writeHead(200);
        response.end(JSON.stringify({ ok: true, result }));
      } catch (error) {
        response.writeHead(500);
        response.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
      }
      return;
    }

    if (url.pathname === "/refresh-cache" && request.method === "POST") {
      await refreshCache();
      response.writeHead(200);
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    response.writeHead(404);
    response.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(PORT, () => log.info(`سلامت کرالر روی پورت ${PORT}`));

  const shutdown = async (signal) => {
    log.info(`${signal} دریافت شد، خاموش‌سازی…`);
    for (const timer of timers.values()) clearInterval(timer);
    server.close();
    await Promise.allSettled([prisma.$disconnect(), closeCache()]);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  log.error("راه‌اندازی کرالر شکست خورد:", error);
  process.exit(1);
});
