# قیمت — qeymat.online

مرجع نرخ لحظه‌ای ارز، طلا، سکه و رمزارز بازار ایران، همراه با نمودار و مقایسه
تا ۱۰ سال، مبدل تومان، هشدار قیمت (اعلان و پیامک)، تحلیل قیمت برای مشترکان
«قیمت پلاس» و API برای توسعه‌دهندگان.

> خرید اکانت هوش مصنوعی و پرداخت ارزی از نسخه‌ی ۲ به [آساپی](https://asapay.pro)
> منتقل شده است و مسیر `/ai` به آنجا هدایت می‌شود.

توسعه: علی چترایی — تیم برنامه‌نویسی آ

---

## ساختار

```
qeymat/
├── apps/
│   ├── web/          Next.js 15 (App Router) + Tailwind — سایت، PWA، پنل‌ها، API
│   ├── worker/       سرویس کرالر: زمان‌بند، آداپتور منابع و موتور تحلیل
│   └── android/      اپ نیتیو اندروید (Kotlin + Compose) با ویجت — apps/android/README.md
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

## منابع نرخ و موتور تحلیل

نرخی که در سایت نمایش داده می‌شود «نرخ خودمان» است: موتور تحلیل
(`apps/worker/src/aggregate.js`) نقل‌قول همه‌ی منابع را جمع می‌کند و از آن‌ها
یک نرخ می‌سازد.

| منبع | آداپتور | تأمین‌کننده‌ی |
|---|---|---|
| الان چند | `alanchand` | دلار، یورو، درهم، لیر، پوند، یوان، دلار کانادا، ین، روبل، دینار |
| TGJU | `tgju` | ارزها، طلای ۱۸ و ۲۴، آبشده (مثقال)، سکه‌ها، تتر، انس |
| کانال‌های تلگرام | `telegram` | دلار نقدی و فردایی تهران، دلار هرات، آبشده، طلا، سکه، ارزها |
| نوبیتکس | `nobitex` | تتر و رمزارزها |
| بن‌بست | `bonbast` | ارز و سکه (پشتیبان) |
| Twelve Data | `twelvedata` | نفت، فلزات، سهام و شاخص‌های جهانی |
| دلخواه | `custom-json` | هر منبع JSON که از پنل مدیریت اضافه شود |

**قرارداد آداپتورها:** کلید خروجی نماد استاندارد با حروف کوچک است (`usd`،
`gold18`) و فیلد `unit` واحد را مشخص می‌کند (`IRT` تومان، `IRR` ریال، `RAW`
بدون تبدیل، یا `usdQuoted`). هر عدد بیرون از بازه‌ی منطقی دارایی
(`lib/parse-fa.js → SANITY`) رد می‌شود تا خطای ریال/تومان وارد نرخ نشود.

**موتور تحلیل** برای هر دارایی:

1. نقل‌قول‌های تازه را با وزن «وزن منبع × کیفیت یادگرفته‌ی منبع × تازگی» جمع می‌کند.
2. پرت‌ها را با میانه و MAD حذف و از باقی «میانگین هوبر» می‌گیرد.
3. اگر منبع مستقیم کم باشد، از رابطه‌ی دارایی‌ها تخمین کمکی می‌سازد
   (مثقال آبشده = گرم طلای ۱۸ × ۴٫۳۳۱۸، طلای ۲۴ = طلای ۱۸ × ۴/۳).
4. جهش بزرگ را فقط با تأیید دو منبع، یا سازگاری با پایانی دیروز، یا
   ۱۰ دقیقه پایداری می‌پذیرد.
5. کیفیت هر منبع را با فاصله‌اش از نرخ نهایی یاد می‌گیرد (ستون `Source.quality`).
6. تغییر روز را نسبت به پایانی آخرین روز معاملاتی حساب و کندل امروز را به‌روز می‌کند.

### کانال‌های تلگرام

از نسخه‌ی وب‌پرویو (`t.me/s/<channel>`) و از طریق رله‌ی Cloudflare Worker خوانده
می‌شوند، چون t.me از سرور ایران در دسترس نیست. آدرس و توکن رله فقط از
`TELEGRAM_RELAY_URL` و `TELEGRAM_RELAY_TOKEN` خوانده می‌شود و در دیتابیس ذخیره
نمی‌شود. کانال‌ها و وزنشان در `seed.mjs` است؛ کانالی که پست‌هایش برچسب ندارد
(مثل `Qeymatabshodeh`) با `defaultSymbol` تعریف می‌شود.

## تاریخچه‌ی ۱۰ ساله

نمودارها از جدول `RateDaily` (کندل روزانه، هرگز پاک نمی‌شود) خوانده می‌شوند و
با دانه‌بندی روزانه، ماهانه یا سالانه‌ی شمسی نمایش داده می‌شوند. این جدول از سه
راه پر می‌شود:

- **نرخ زنده‌ی خودمان** — موتور تحلیل کندل امروز را مدام به‌روز می‌کند (مقدم بر بقیه).
- **روش ۲: بک‌فیل از آرشیو TGJU** — کرالر هنگام راه‌اندازی تاریخچه‌ی دارایی‌هایی
  که کمتر از یک سال داده دارند را تا ۱۰ سال پر می‌کند و هر شنبه همگام می‌شود.
  دستی: `npm run history:backfill --workspace=@qeymat/worker -- --force`
- **روش ۳: فایل CSV** — برای دارایی‌هایی که آرشیو بیرونی ندارند (دلار هرات، فردایی):
  ```bash
  # ستون‌ها: symbol,date,close,open,high,low — قیمت تومانی، تاریخ شمسی یا میلادی
  npm run history:import --workspace=@qeymat/worker -- ./herat.csv
  # یا روی سرور:
  curl -X POST -H "x-worker-token: $WORKER_TOKEN" --data-binary @herat.csv \
    "http://127.0.0.1:4001/import-csv"
  ```

## هشدار قیمت و قیمت پلاس

- همه‌ی قیمت‌ها برای همه رایگان و قابل مشاهده است.
- هشدار قیمت فقط برای کاربر واردشده با شماره موبایل ثبت می‌شود؛ اعلان مرورگر
  رایگان است. هر ورود ۳۰ روز روی دستگاه می‌ماند.
- **قیمت پلاس**: تحلیل قیمت (روند، RSI، MACD، حمایت و مقاومت، حباب سکه، بازدهی تا
  ۱۰ سال) و هشدار پیامکی برای ۱۰ شاخص. **پلاس حرفه‌ای**: همان، برای ۵۰ شاخص.
- پیامک هشدار با الگوی `SMS_ALERT_TEMPLATE` پنل پیامک ارسال می‌شود.

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
| `GET /rates/:symbol/history?range=5y&interval=month` | سری زمانی تا ۱۰ سال (روزانه/ماهانه/سالانه) |
| `GET /convert?from=USD&amount=250` | تبدیل به تومان |

هر پاسخ موفق `X-Quota-Remaining` و `X-RateLimit-Remaining` برمی‌گرداند.

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

کرالر خودش شبانه ساعت ۴ نقاط ۱۵ دقیقه‌ای قدیمی‌تر از `HISTORY_RETENTION_DAYS` و لاگ
مصرف قدیمی‌تر از ۹۰ روز را پاک می‌کند. کندل‌های روزانه (`RateDaily`) پاک نمی‌شوند.

## کانال‌های قیمت تلگرام

چهار کانال مستقل برای طلای ۱۸ عیار، یورو، دلار و تتر می‌توانند هر نیم‌ساعت
تصویر و نرخ تازه دریافت کنند. انتشار با workflow به نام `Telegram Price Channels`
انجام می‌شود تا محدودیت دسترسی سرور ایران به API تلگرام مانع ارسال نشود.

1. چهار کانال را بسازید و ربات را با مجوز `Post Messages` مدیر هر چهار کانال کنید.
2. در GitHub Actions چهار Secret به نام‌های `TELEGRAM_CHANNEL_GOLD`،
   `TELEGRAM_CHANNEL_EUR`، `TELEGRAM_CHANNEL_USD` و `TELEGRAM_CHANNEL_USDT`
   و Secret موجود `TELEGRAM_BOT_TOKEN` را تنظیم کنید. مقدار کانال می‌تواند
   `@username` یا شناسهٔ عددی `-100...` باشد.
3. Variableهای `TELEGRAM_MAIN_CHANNEL_URL` و `TELEGRAM_MAIN_CHANNEL_LABEL` را
   برای اتصال این کانال‌ها به کانال اصلی تنظیم کنید.
4. بازهٔ پیش‌فرض ۹ صبح تا ۱۰ شب تهران است. در صورت نیاز با Variableهای
   `TELEGRAM_PUBLISH_START` و `TELEGRAM_PUBLISH_END` تغییرش دهید.
5. در پایان `TELEGRAM_CHANNELS_ENABLED=true` را به‌عنوان Repository Variable
   بگذارید. پیش از فعال‌سازی، workflow را دستی اجرا کنید تا هر چهار ارسال آزمایش شود.

لوگوهای آماده در `apps/web/public/telegram/channels` هستند و با دستور
`npm run telegram:logos` دوباره ساخته می‌شوند.

---

## فازهای بعدی

- اپ iOS با Swift/SwiftUI و ویجت WidgetKit بر پایه‌ی همین API (اندروید در `apps/android` آماده است)
- ربات تلگرام (زیرساخت اعلان و API آماده است)
