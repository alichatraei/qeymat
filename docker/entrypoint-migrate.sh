#!/bin/sh
# ---------------------------------------------------------------
# آماده‌سازی دیتابیس پیش از بالا آمدن سرویس‌ها.
# در کانتینر یک‌بارمصرف `migrate` اجرا می‌شود.
# ---------------------------------------------------------------
set -e

SCHEMA="packages/db/prisma/schema.prisma"
MIGRATIONS="packages/db/prisma/migrations"

if [ -z "$DATABASE_URL" ]; then
  echo "✖ DATABASE_URL خالی است — آن را در .env بگذارید"
  exit 1
fi

# میزبان و کاربر آدرس دیتابیس، بدون رمز، برای عیب‌یابی
echo "→ انتظار برای آماده شدن دیتابیس ($(echo "$DATABASE_URL" | sed -E 's#^[a-z]+://([^:@/]+)(:[^@]*)?@([^/?]+).*#\1@\3#'))…"
i=0
until node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
c.connect().then(() => c.end()).catch((e) => { console.error(e.message); process.exit(1); });
" > /tmp/db-error 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "✖ دیتابیس بعد از ۶۰ ثانیه پاسخ نداد. آخرین خطا:"
    echo "  $(tail -1 /tmp/db-error)"
    echo "  password authentication failed ← رمز با رمز اولیه‌ی دیتابیس یکی نیست"
    echo "  ENOTFOUND / ECONNREFUSED       ← میزبان DATABASE_URL باید postgres باشد"
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