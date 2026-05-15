-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
