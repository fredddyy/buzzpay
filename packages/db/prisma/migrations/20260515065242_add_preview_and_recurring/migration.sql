-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previewStart" TEXT;
