-- AlterTable
ALTER TABLE "Rate" ADD COLUMN     "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sourceCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "SourceQuote" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "buy" DOUBLE PRECISION,
    "sell" DOUBLE PRECISION NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceQuote_assetId_at_idx" ON "SourceQuote"("assetId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "SourceQuote_assetId_sourceKey_key" ON "SourceQuote"("assetId", "sourceKey");

-- AddForeignKey
ALTER TABLE "SourceQuote" ADD CONSTRAINT "SourceQuote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
