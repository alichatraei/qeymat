# قیمت — اپ اندروید

اپ نیتیو اندروید با **Kotlin + Jetpack Compose**، با ویجت صفحه‌ی اصلی
(**Glance**). رابط کاربری از روی طراحی «Qeymat Mobile App» ساخته شده:
قیمت، تبدیل، هشدار، تنظیمات، کاتالوگ ارزهای جهان، جست‌وجو و شیت جزئیات.

- حداقل اندروید ۷ (API 24) · هدف API 35
- همیشه راست‌به‌چپ و تیره، فونت وزیرمتن، ارقام و تقویم شمسی
- داده از همان API سایت qeymat.online

---

## معماری

```
apps/android/
├── app/                 Application، MainActivity، نوار زبانه، اعلان هشدارها
├── core/
│   ├── model/           مدل‌های API + قالب‌بندی فارسی و تقویم شمسی (Kotlin خالص، تست واحد دارد)
│   ├── network/         Retrofit + OkHttp + kotlinx.serialization
│   ├── data/            مخزن‌ها، DataStore (نشست و تنظیمات)، کش اسنپ‌شات، ماژول Koin
│   └── designsystem/    رنگ‌ها، فونت، آیکون‌ها، کارت، تراشه، نمودار، کاشی دارایی
├── feature/
│   ├── prices/          صفحه‌ی قیمت، کارت اصلی و نمودار، مرتب‌سازی با کشیدن، جست‌وجو، کاتالوگ، شیت جزئیات، ساخت هشدار
│   ├── convert/         مبدل ارز و طلا و رمزارز
│   ├── alerts/          ورود با شماره موبایل و فهرست هشدارها
│   └── settings/        تنظیمات و قیمت پلاس
└── widget/              ویجت «قیمت‌های منتخب» و «قیمت دلار» + Worker به‌روزرسانی
```

- **جهت وابستگی:** `feature → core:data → core:network → core:model`؛
  `designsystem` فقط به `model` وابسته است. ماژول‌های feature هم را نمی‌شناسند؛
  جابه‌جایی بین زبانه‌ها با callback در `app` انجام می‌شود.
- **الگو:** MVVM یک‌طرفه — هر صفحه یک `ViewModel` دارد که `StateFlow` از
  وضعیت صفحه می‌دهد؛ Composable فقط وضعیت را نمایش می‌دهد و رویداد می‌فرستد.
- **تزریق وابستگی:** Koin (بدون تولید کد، مناسب ساخت چندماژوله).
- **آفلاین:** آخرین اسنپ‌شات قیمت روی دیسک است؛ اپ و ویجت بدون اینترنت هم
  آخرین قیمت‌ها را نشان می‌دهند.
- **نشست:** توکن ورود در DataStore، ۳۰ روز معتبر، با هدر
  `Authorization: Bearer` فرستاده می‌شود. شماره‌ی آخرین ورود برای پرکردن
  خودکار می‌ماند و از پشتیبان‌گیری ابری مستثناست.

### ویجت‌ها

| ویجت | محتوا |
|---|---|
| قیمت‌های منتخب | ارزهای صفحه‌ی اول اپ، به همان ترتیب؛ تعداد ردیف با اندازه‌ی ویجت |
| قیمت دلار | نرخ دلار، تغییر روز و نمودار یک هفته |

هر ۱۵ دقیقه (کمترین فاصله‌ی مجاز اندروید) با WorkManager تازه می‌شوند؛ با
بسته‌شدن اپ و با زدن ساعت بالای ویجت هم فوراً به‌روز می‌شوند.

### اعلان هشدار

سرور عبور قیمت از هدف را تشخیص می‌دهد (و برای مشترکان پلاس پیامک می‌فرستد).
اپ هر ۱۵ دقیقه هشدارهای اجراشده‌ی تازه را می‌گیرد و اعلان نشان می‌دهد. این
روش به سرویس‌های گوگل (FCM) وابسته نیست که در ایران پایدار نیستند.

---

## ساخت

### روی سیستم داخل ایران

مخزن گوگل (`dl.google.com`) از ایران در دسترس نیست. در فایل
`~/.gradle/gradle.properties` این خط را بگذارید تا وابستگی‌ها از آینه‌ی
عمومی Aliyun گرفته شوند:

```properties
qeymat.useMirror=true
```

بعد پوشه‌ی `apps/android` را در Android Studio باز کنید (Gradle 8.11.1،
JDK 17 به بالا) و `app` را اجرا کنید.

### از خط فرمان

```bash
cd apps/android
gradle :core:model:test assembleDebug
```

فایل `gradle-wrapper.jar` در ریپو نیست؛ Android Studio نسخه‌ی Gradle را از
`gradle/wrapper/gradle-wrapper.properties` می‌خواند. برای ساختن wrapper:
`gradle wrapper --gradle-version 8.11.1`.

### CI

هر push روی `main` که پوشه‌ی `apps/android` را تغییر دهد، workflow
`Android` را اجرا می‌کند: تست واحد، APK دیباگ و APK انتشار (با R8). فایل‌ها
از صفحه‌ی همان اجرا در GitHub Actions (بخش Artifacts) دانلود می‌شوند. تغییرات
این پوشه سرور را دوباره مستقر نمی‌کند.

### انتشار نسخه (کافه‌بازار و مایکت)

با push هر تگ `v*` (مثلاً `v2.1.0`)، workflow `Android Release`:

1. APK و AAB **امضاشده** می‌سازد. نسخه از تگ می‌آید و `versionCode` از آن
   ساخته می‌شود (`2.1.0` ← `20100`)، پس هر نسخه از قبلی بزرگ‌تر است.
2. یک GitHub Release با همین دو فایل و فهرست کامیت‌ها از تگ قبلی می‌سازد.
3. اگر ربات تلگرام تنظیم شده باشد، خبر نسخه و فایل APK را در تاپیک گروه
   می‌فرستد.

Secretهای لازم در تنظیمات مخزن (Settings ← Secrets and variables ← Actions):
`ANDROID_KEYSTORE_BASE64`، `ANDROID_KEYSTORE_PASSWORD`، `ANDROID_KEY_ALIAS`،
`ANDROID_KEY_PASSWORD` و برای تلگرام `TELEGRAM_BOT_TOKEN`، `TELEGRAM_CHAT_ID`،
`TELEGRAM_TOPIC_ID`.

⚠️ کلید امضا را جای امنی نگه دارید. بازار و مایکت به‌روزرسانی را فقط با همان
کلید اولین بارگذاری می‌پذیرند؛ گم شدنش یعنی انتشار اپ با نام بسته‌ی جدید.

### امضای نسخه‌ی انتشار روی سیستم خودتان

فایل `apps/android/keystore.properties` (در گیت نیست) بسازید:

```properties
storeFile=release.jks
storePassword=…
keyAlias=qeymat
keyPassword=…
```

بدون این فایل، APK انتشار بدون امضا ساخته می‌شود.

---

## API مورد استفاده (قرارداد مشترک اندروید و iOS)

پایه: `https://qeymat.online/` — همه‌ی درخواست‌ها هدر
`x-qeymat-client: android/<نسخه>` (یا `ios/<نسخه>`) دارند.

| مسیر | کار |
|---|---|
| `GET api/public/rates` | همه‌ی نرخ‌ها: `{ updatedAt, assets: [{ symbol, nameFa, nameEn, category, featured, countryCode, unit, buy, sell, changePercent, dayLow, dayHigh, confidence, sourceCount, fetchedAt }] }` |
| `GET api/public/history?symbol=USD&range=1d\|1w\|1m\|1y\|5y\|10y` | `{ series: { interval, firstDay, yearsAvailable, points: [{ at, value, open, high, low }] } }` |
| `POST api/auth/otp/send` `{ phone }` | ارسال کد ورود |
| `POST api/auth/otp/verify` `{ phone, code }` | با هدر `x-qeymat-client` پاسخ شامل `token` است |
| `GET api/me` | کاربر و وضعیت قیمت پلاس (`plus.active`, `plus.smsLimit`) |
| `GET/POST/DELETE api/alerts` | فهرست، ساخت (`{ symbol, threshold, sms }`) و حذف (`?id=`) هشدار |
| `GET api/plus/analysis?symbol=USD` | تحلیل قیمت (فقط پلاس؛ ۴۰۲ برای بقیه) |

قیمت‌ها تومانی‌اند مگر `unit == "USD"`. زمان‌ها ISO به وقت جهانی‌اند و برای
نمایش به وقت تهران (UTC+3:30) و تقویم شمسی تبدیل می‌شوند.

## نسخه‌ی iOS (فاز بعد)

طبق برنامه با **Swift + SwiftUI** و ویجت با **WidgetKit**، روی همین API.
معماری پیشنهادی آینه‌ی همین ساختار است: `QeymatKit` (مدل، شبکه، مخزن‌ها،
قالب‌بندی شمسی) به‌عنوان Swift Package مشترک بین اپ و افزونه‌ی ویجت، و
صفحه‌ها با `@Observable` ViewModel.
