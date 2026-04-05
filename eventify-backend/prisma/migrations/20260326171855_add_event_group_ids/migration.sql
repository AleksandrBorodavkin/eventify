-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "groupIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
