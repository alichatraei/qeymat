# قیمت — qeymat.online

مرجع نرخ لحظه‌ای ارز، طلا، سکه و رمزارز بازار ایران، همراه با مبدل تومان،
API برای توسعه‌دهندگان، اعلان قیمت و بخش خرید اکانت هوش مصنوعی و پرداخت ارزی.

توسعه: علی چترایی — تیم برنامه‌نویسی آ

---

## ساختار

```
qeymat/
├── apps/
│   ├── web/          Next.js 15 (App Router) + Tailwind — سایت، PWA، پنل‌ها، API
│   └── worker/       سرویس کرالر: زمان‌بند و آداپتور منابع نرخ
├── packages/
│   ├── db/           اسکیمای Prisma، کلاینت مشترک و seed
│   └── shared/       پلن‌ها، فرمت اعداد فارسی و محاسبات مشترک
├── docker/           Dockerfileها، compose و کانفیگ nginx
├── scripts/          تولید کلید VAPID و آیکون‌ها
└── .github/workflows/deploy.yml
```

دو سرویس مستقل‌اند و از طریق PostgreSQL و Redis با هم حرف می‌زنند:

- **کرالر** هر چند ثانیه منابع را می‌خواند، نرخ‌ها را در Postgres می‌نویسد و یک
  اسنپ‌شات کامل بازار را در Redis می‌گذارد.
- **وب** اسنپ‌شات را از Redis می‌خواند؛ اگر Redis در دسترس نبود، مستقیم از
  Postgres می‌خواند. یعنی قطعی Redis سایت را نمی‌خواباند.

---

## منابع نرخ

| منبع | آداپتور | تأمین‌کننده‌ی |
|---|---|---|
| نوبیتکس | `nobitex` | تتر، بیت‌کوین، اتریوم، سولانا، تون، ریپل، دوج، BNB، ترون، کاردانو |
| الان چند | `alanchand` | دلار، یورو، درهم، لیر، پوند، دلار کانادا، ین، یوان، روبل، دینار |
| بن‌بست | `bonbast` | ارز کاغذی (منبع پشتیبان) و سکه |
| TGJU | `tgju` | طلای ۱۸ و ۲۴ عیار، سکه امامی، بهار، نیم، ربع، گرمی، انس |
| دلخواه | `custom-json` | هر منبع JSON که از پنل مدیریت اضافه شود |

فاصله‌ی به‌روزرسانی، endpoint و تنظیمات هر منبع از جدول `Source` خوانده می‌شود
و از پنل مدیریت قابل تغییر است — بدون نیاز به دیپلوی مجدد.

> نکته‌ی مهم: سایت‌های الان چند و بن‌بست خروجی رسمی ندارند و آداپتورشان HTML را
> پارس می‌کند. اگر ساختار صفحه‌شان عوض شد، منبع در پنل مدیریت به وضعیت «قطع» با
> متن خطا می‌رود و بقیه‌ی منابع سر جایشان می‌مانند. آن موقع فقط سلکتورهای همان
> آداپتور نیاز به اصلاح دارد.

---

## راه‌اندازی محلی

```bash
npm install
npx prisma generate --schema packages/db/prisma/schema.prisma

cp .env.example .env      # مقادیر را پر کنید
npm run vapid:generate    # کلیدهای اعلان را در .env بگذارید

npm run db:push           # یا db:migrate برای محیط واقعی
npm run db:seed

npm run dev               # وب روی :3000
npm run dev:worker        # کرالر روی :4001
```

برای توسعه‌ی محلی، `DATABASE_URL` باید به `localhost` اشاره کند نه `postgres`.

---

## استقرار روی سرور

### یک‌بار، دستی

```bash
ssh user@server
git clone git@github.com:USERNAME/qeymat.git ~/qeymat
cd ~/qeymat

cp .env.example .env
nano .env                 # همه‌ی مقادیر را پر کنید

docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```

nginx:

```bash
sudo cp docker/nginx-qeymat.conf /etc/nginx/sites-available/qeymat.online
sudo ln -s /etc/nginx/sites-available/qeymat.online /etc/nginx/sites-enabled/
sudo certbot --nginx -d qeymat.online -d www.qeymat.online
sudo nginx -t && sudo systemctl reload nginx
```

### از این به بعد، خودکار

هر push روی `main` این مسیر را می‌رود: بررسی تایپ و lint ← ساخت دو تصویر و
انتشار در GHCR ← ورود SSH به سرور، کشیدن تصویر، migration، بالا آوردن سرویس‌ها،
بررسی سلامت. اگر سلامت رد شود، لاگ را چاپ و job را fail می‌کند.

**سکرت‌های لازم در GitHub** (`Settings → Secrets and variables → Actions`):

| نام | مقدار |
|---|---|
| `SSH_HOST` | آی‌پی یا دامنه‌ی سرور |
| `SSH_USER` | کاربر SSH |
| `SSH_KEY` | کلید خصوصی SSH (کل متن) |
| `SSH_PORT` | پورت SSH، اگر ۲۲ نیست |
| `DEPLOY_PATH` | مسیر پروژه روی سرور، مثلاً `/home/user/qeymat` |
| `GHCR_TOKEN` | توکن با دسترسی `read:packages` برای کشیدن تصویر |

---

## API

پایه: `https://qeymat.online/api/v1` — احراز با هدر `X-API-Key`.

| مسیر | کار |
|---|---|
| `GET /rates` | همه‌ی نرخ‌ها، با فیلتر اختیاری `?category=currency\|gold\|crypto` |
| `GET /rates/:symbol` | جزئیات یک دارایی |
| `GET /rates/:symbol/history?range=30` | سری زمانی برای نمودار |
| `GET /convert?from=USD&amount=250` | تبدیل به تومان |

هر پاسخ موفق `X-Quota-Remaining` و `X-RateLimit-Remaining` برمی‌گرداند.
پلن‌ها با تتر روی BEP20 پرداخت و پس از تأیید مدیر فعال می‌شوند.

---

## نگهداری

```bash
# لاگ زنده
docker compose -f docker/docker-compose.yml logs -f worker

# وضعیت سلامت منابع
curl -s localhost:4001/health | jq

# اجرای دستی همه‌ی منابع
docker compose -f docker/docker-compose.yml exec worker \
  node -e "import('./src/crawler.js').then(m=>m.runAll()).then(console.log)"

# پشتیبان دیتابیس
docker compose -f docker/docker-compose.yml exec postgres \
  pg_dump -U qeymat qeymat | gzip > backup-$(date +%F).sql.gz
```

کرالر خودش شبانه ساعت ۴ تاریخچه‌ی قدیمی‌تر از `HISTORY_RETENTION_DAYS` و لاگ
مصرف قدیمی‌تر از ۹۰ روز را پاک می‌کند.

---

## فازهای بعدی

- اپ اندروید و iOS بر پایه‌ی همین API
- ربات تلگرام (زیرساخت اعلان و API آماده است)
