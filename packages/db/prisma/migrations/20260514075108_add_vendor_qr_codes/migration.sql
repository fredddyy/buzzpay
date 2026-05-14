-- CreateTable
CREATE TABLE "LoyaltyCard" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "stamps" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 5,
    "rewardsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorQrCode" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "vendorId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "assignedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorQrCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyCard_studentId_idx" ON "LoyaltyCard"("studentId");

-- CreateIndex
CREATE INDEX "LoyaltyCard_vendorId_idx" ON "LoyaltyCard"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_studentId_vendorId_key" ON "LoyaltyCard"("studentId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQrCode_serialNumber_key" ON "VendorQrCode"("serialNumber");

-- CreateIndex
CREATE INDEX "VendorQrCode_vendorId_idx" ON "VendorQrCode"("vendorId");

-- CreateIndex
CREATE INDEX "VendorQrCode_serialNumber_idx" ON "VendorQrCode"("serialNumber");

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQrCode" ADD CONSTRAINT "VendorQrCode_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
