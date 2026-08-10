-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_dealId_fkey";

-- DropIndex
DROP INDEX "Voucher_paymentId_key";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "vendorId" TEXT,
ALTER COLUMN "dealId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "orderItemId" TEXT;

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_paymentId_idx" ON "OrderItem"("paymentId");

-- CreateIndex
CREATE INDEX "OrderItem_dealId_idx" ON "OrderItem"("dealId");

-- CreateIndex
CREATE INDEX "Payment_vendorId_idx" ON "Payment"("vendorId");

-- CreateIndex
CREATE INDEX "Voucher_paymentId_idx" ON "Voucher"("paymentId");

-- CreateIndex
CREATE INDEX "Voucher_orderItemId_idx" ON "Voucher"("orderItemId");

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
