-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "quality" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PriceAlert" ADD COLUMN     "push" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "subId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "RateDaily" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'live',

    CONSTRAINT "RateDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateDaily_assetId_day_idx" ON "RateDaily"("assetId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "RateDaily_assetId_day_key" ON "RateDaily"("assetId", "day");

-- CreateIndex
CREATE INDEX "PriceAlert_userId_isActive_idx" ON "PriceAlert"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "RateDaily" ADD CONSTRAINT "RateDaily_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------
-- داده‌ها
-- ---------------------------------------------------------------

-- هشدارهای قدیمی به صاحب اشتراک پوش‌شان وصل می‌شوند؛
-- هشدار بدون کاربر در نسخه‌ی ۲ دیگر ارسال نمی‌شود.
UPDATE "PriceAlert" AS a
SET "userId" = s."userId"
FROM "PushSubscription" AS s
WHERE a."subId" = s."id" AND a."userId" IS NULL AND s."userId" IS NOT NULL;

UPDATE "PriceAlert" SET "isActive" = false WHERE "userId" IS NULL;

-- نقل‌قول‌ها ورودی موقت اجماع‌اند. نسخه‌ی قبلی نرخ ریالی TGJU را بدون تبدیل
-- ذخیره می‌کرد (ده برابر مقدار واقعی)؛ با پاک کردنشان چند دقیقه بعد
-- نقل‌قول‌های درست جایگزین می‌شوند.
DELETE FROM "SourceQuote";

-- در نسخه‌ی ۲ همه‌ی قیمت‌ها برای همه قابل مشاهده است
UPDATE "Asset" SET "tier" = 'FREE';
