import http from "node:http";
import { createRequire } from "node:module";
import cron from "node-cron";
import { runSource, runAll, refreshCache, settle } from "./crawler.js";
import { backfillAll, rollupFromHistory } from "./history/backfill.js";
import { importCsv } from "./history/import-csv.js";
import { repairDollarHistory } from "./history/repair.js";
import { closeCache } from "./lib/cache.js";
import { log } from "./lib/log.js";

const require = createRequire(import.meta.url);
const { prisma } = require("@qeymat/db");

const PORT = Number(process.env.WORKER_PORT || 4001);
const timers = new Map();
/** جلوگیری از همپوشانی اجراها وقتی منبع کند است: کلید ← زمان شروع */
const running = new Map();

/**
 * سقف زمان یک اجرا. اگر اجرایی به هر دلیل برنگردد (درخواست یا سرویسی که
 * جواب نمی‌دهد)، منبع برای همیشه «در حال اجرا» نمی‌ماند و دور بعد دوباره
 * اجرا می‌شود.
 */
function runLimitMs(intervalSec) {
  return Math.max(120, intervalSec * 3) * 1000;
}

function withDeadline(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} بیش از ${Math.round(ms / 1000)} ثانیه طول کشید`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function tick(key, intervalSec) {
  const limit = runLimitMs(intervalSec);
  const startedAt = running.get(key);
  if (startedAt && Date.now() - startedAt < limit) return;
  if (startedAt) log.warn(`[${key}] اجرای قبلی گیر کرده بود؛ دوباره اجرا می‌شود`);

  const mine = Date.now();
  running.set(key, mine);
  try {
    await withDeadline(
      (async () => {
        await runSource(key);
        // نرخ نهایی بعد از هر منبع تازه دوباره محاسبه می‌شود
        await settle();
      })(),
      limit,
      `اجرای ${key}`,
    );
  } catch (error) {
    // خطای خود منبع داخل runSource لاگ و ثبت شده است؛ اینجا فقط گیر کردن
    if (String(error?.message || "").includes("طول کشید")) log.error(`[${key}] ${error.message}`);
  } finally {
    // اجرای گیرکرده‌ی قدیمی نباید قفل اجرای تازه را بردارد
    if (running.get(key) === mine) running.delete(key);
  }
}

/** زمان‌بند را با فواصل تعریف‌شده در جدول Source می‌سازد. */
async function schedule() {
  for (const timer of timers.values()) clearInterval(timer);
  timers.clear();

  const sources = await prisma.source.findMany({ where: { isActive: true } });
  for (const source of sources) {
    const intervalMs = Math.max(15, source.intervalSec) * 1000;
    timers.set(
      source.key,
      setInterval(() => tick(source.key, source.intervalSec), intervalMs),
    );
    log.info(`زمان‌بندی ${source.key} هر ${source.intervalSec} ثانیه`);
  }
}

/** پاک‌سازی تاریخچه‌ی قدیمی و لاگ مصرف */
async function cleanup() {
  const historyDays = Number(process.env.HISTORY_RETENTION_DAYS || 400);
  const usageDays = Number(process.env.USAGE_RETENTION_DAYS || 90);
  const cutoff = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [otp, history, usage, quotes] = await Promise.all([
    // کد ورود یک روز پس از انقضا؛ صفحه‌ی حریم خصوصی همین مدت را اعلام کرده است
    prisma.otpCode.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.rateHistory.deleteMany({
      where: { at: { lt: cutoff(historyDays) } },
    }),
    prisma.usageLog.deleteMany({ where: { at: { lt: cutoff(usageDays) } } }),
    // نقل‌قول‌ها فقط ورودی موقت اجماع‌اند و ارزش نگهداری بلندمدت ندارند
    prisma.sourceQuote.deleteMany({
      where: { at: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
    }),
  ]);
  log.info(
    `پاک‌سازی: ${history.count} تاریخچه، ${usage.count} لاگ مصرف، ${quotes.count} نقل‌قول، ${otp.count} کد ورود`,
  );
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
  await runAll().then((results) =>
    log.info("اجرای اولیه:", JSON.stringify(results)),
  );
  await schedule();

  // نقطه‌های خراب تاریخچه‌ی دلار (مثل افت اشتباه ۷ مهر) پاک و کندل‌ها بازسازی می‌شوند
  repairDollarHistory()
    .then((report) => report.removed && log.info("تعمیر تاریخچه:", JSON.stringify(report)))
    .catch((error) => log.error("تعمیر تاریخچه شکست خورد:", error));

  // تاریخچه‌ی ۱۰ ساله: در پس‌زمینه تا راه‌اندازی معطل نماند.
  // فقط دارایی‌هایی که هنوز تاریخچه‌ی کافی ندارند پر می‌شوند.
  backfillAll()
    .then((report) => log.info("بک‌فیل تاریخچه:", JSON.stringify(report)))
    .catch((error) => log.error("بک‌فیل تاریخچه شکست خورد:", error));

  // هر ۱۰ دقیقه زمان‌بندی را با تنظیمات پنل مدیریت همگام می‌کند
  cron.schedule("*/10 * * * *", () =>
    schedule().catch((error) => log.error(error)),
  );
  // نگهداشت شبانه، ۴ بامداد تهران
  cron.schedule(
    "0 4 * * *",
    () =>
      cleanup()
        .then(() => repairDollarHistory({ days: 3 }))
        .catch((error) => log.error(error)),
    {
      timezone: "Asia/Tehran",
    },
  );
  cron.schedule("*/30 * * * *", () =>
    expireSubscriptions().catch((error) => log.error(error)),
  );
  // کندل روزهای گذشته از تاریخچه‌ی زنده، بامداد تهران
  cron.schedule(
    "10 0 * * *",
    () => rollupFromHistory().catch((error) => log.error(error)),
    { timezone: "Asia/Tehran" },
  );
  // همگام‌سازی هفتگی با آرشیو TGJU برای پر کردن روزهای جاافتاده
  cron.schedule(
    "30 5 * * 6",
    () => backfillAll({ force: true }).catch((error) => log.error(error)),
    { timezone: "Asia/Tehran" },
  );

  const server = http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      log.error("خطای درخواست:", error?.message || error);
      if (!response.headersSent) response.writeHead(500);
      response.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
    });
  });

  async function handle(request, response) {
    const url = new URL(request.url, `http://localhost:${PORT}`);
    response.setHeader("Content-Type", "application/json; charset=utf-8");

    if (url.pathname === "/health") {
      const sources = await prisma.source.findMany({
        select: {
          key: true,
          status: true,
          lastFetchedAt: true,
          lastLatencyMs: true,
          lastError: true,
        },
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
        response.end(
          JSON.stringify({ ok: false, error: String(error?.message || error) }),
        );
      }
      return;
    }

    // بک‌فیل دستی تاریخچه: POST /backfill?symbols=USD,EUR&force=1
    if (url.pathname === "/backfill" && request.method === "POST") {
      if (!authorized(request)) return deny(response);
      const symbols = url.searchParams.get("symbols")?.split(",").filter(Boolean);
      const result = await backfillAll({ symbols, force: url.searchParams.get("force") === "1" });
      response.writeHead(200);
      response.end(JSON.stringify({ ok: true, result }));
      return;
    }

    // درون‌ریزی CSV: بدنه‌ی درخواست متن فایل است
    if (url.pathname === "/import-csv" && request.method === "POST") {
      if (!authorized(request)) return deny(response);
      const text = await readBody(request, 20 * 1024 * 1024);
      const result = await importCsv(text, {
        symbol: url.searchParams.get("symbol") || undefined,
        overwriteLive: url.searchParams.get("overwriteLive") === "1",
      });
      response.writeHead(200);
      response.end(JSON.stringify({ ok: true, result }));
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
  }

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

function authorized(request) {
  const token = request.headers["x-worker-token"];
  return Boolean(process.env.WORKER_TOKEN) && token === process.env.WORKER_TOKEN;
}

function deny(response) {
  response.writeHead(401);
  response.end(JSON.stringify({ error: "unauthorized" }));
}

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("فایل بزرگ‌تر از حد مجاز است"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

main().catch((error) => {
  log.error("راه‌اندازی کرالر شکست خورد:", error);
  process.exit(1);
});
