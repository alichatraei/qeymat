# فایل‌های استقرار

- `web.Dockerfile` — تصویر Next.js با خروجی standalone
- `worker.Dockerfile` — تصویر سرویس کرالر
- `docker-compose.yml` — Postgres، Redis، migrate، web، worker
- `entrypoint-migrate.sh` — اجرای migration و seed پیش از بالا آمدن سرویس‌ها
- `nginx-qeymat.conf` — بلوک nginx برای qeymat.online

دستور اجرا همیشه از ریشه‌ی پروژه:

```bash
docker compose -f docker/docker-compose.yml --env-file .env up -d
```

`context` در compose روی `..` تنظیم شده تا کل مونوریپو در دسترس بیلد باشد.
