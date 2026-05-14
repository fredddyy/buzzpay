-- CreateIndex
CREATE INDEX "Deal_isActive_startsAt_expiresAt_remainingQty_idx" ON "Deal"("isActive", "startsAt", "expiresAt", "remainingQty");

-- CreateIndex
CREATE INDEX "Deal_vendorId_isActive_expiresAt_idx" ON "Deal"("vendorId", "isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Payment_dealId_status_idx" ON "Payment"("dealId", "status");

-- CreateIndex
CREATE INDEX "Payment_userId_dealId_createdAt_idx" ON "Payment"("userId", "dealId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Voucher_dealId_status_idx" ON "Voucher"("dealId", "status");

-- CreateIndex
CREATE INDEX "Voucher_studentId_createdAt_idx" ON "Voucher"("studentId", "createdAt");
