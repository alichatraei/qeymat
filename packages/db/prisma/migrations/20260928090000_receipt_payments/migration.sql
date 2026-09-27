-- CreateTable
CREATE TABLE "ReceiptPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "plan" TEXT NOT NULL,
    "amountToman" INTEGER NOT NULL,
    "receiptFile" TEXT NOT NULL,
    "receiptMime" TEXT NOT NULL,
    "trackingCode" TEXT,
    "payerCardLast4" TEXT,
    "userNote" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptPayment_status_createdAt_idx" ON "ReceiptPayment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReceiptPayment_userId_createdAt_idx" ON "ReceiptPayment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReceiptPayment" ADD CONSTRAINT "ReceiptPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

