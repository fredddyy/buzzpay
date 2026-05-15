-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "featuredSection" TEXT,
    "dailyStart" TEXT,
    "dailyEnd" TEXT,
    "previewStart" TEXT,
    "activeDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
