-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "activeDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "dailyEnd" TEXT,
ADD COLUMN     "dailyStart" TEXT,
ADD COLUMN     "featuredSection" TEXT;
