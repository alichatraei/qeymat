#!/bin/sh
# اجرای migration و seed پیش از بالا آمدن سرویس‌ها.
# این اسکریپت در کانتینر یک‌بارمصرف `migrate` اجرا می‌شود.
set -e

echo "→ انتظار برای آماده شدن دیتابیس…"
for i in $(seq 1 30); do
  if npx prisma migrate status --schema packages/db/prisma/schema.prisma >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "→ اجرای migration"
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

echo "→ seed دارایی‌ها، منابع و محصولات"
node packages/db/seed.mjs

echo "✓ دیتابیس آماده است"
