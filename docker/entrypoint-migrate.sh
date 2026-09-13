#!/bin/sh
# ---------------------------------------------------------------
# آماده‌سازی دیتابیس پیش از بالا آمدن سرویس‌ها.
# در کانتینر یک‌بارمصرف `migrate` اجرا می‌شود.
# ---------------------------------------------------------------
set -e

SCHEMA="packages/db/prisma/schema.prisma"
MIGRATIONS="packages/db/prisma/migrations"

echo "→ انتظار برای آماده شدن دیتابیس…"
i=0
until node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.end()).catch(() => process.exit(1));
" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "✖ دیتابیس بعد از ۶۰ ثانیه پاسخ نداد"
    exit 1
  fi
  sleep 2
done
echo "✓ دیتابیس در دسترس است"

if [ -d "$MIGRATIONS" ] && [ -n "$(ls -A "$MIGRATIONS" 2>/dev/null)" ]; then
  echo "→ اجرای migration"
  npx prisma migrate deploy --schema "$SCHEMA"
else
  # بدون migration، دستور migrate deploy بی‌صدا هیچ جدولی نمی‌سازد و اپ با
  # خطای «relation does not exist» بالا می‌آید. پس ساختار را مستقیم از
  # schema می‌سازیم و هشدار می‌دهیم.
  echo "⚠ هیچ migration ای در ریپو نیست."
  echo "  ساختار دیتابیس مستقیم از schema ساخته می‌شود (db push)."
  echo "  برای پروداکشن یک‌بار روی سیستم خودتان اجرا کنید:"
  echo "     npm run db:migrate:dev -- --name init"
  echo "  و پوشه‌ی migrations را کامیت کنید."
  npx prisma db push --schema "$SCHEMA" --skip-generate
fi

echo "→ seed دارایی‌ها، منابع و محصولات"
node packages/db/seed.mjs

echo "✓ دیتابیس آماده است"