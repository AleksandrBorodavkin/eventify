-- AlterTable
ALTER TABLE "User" ADD COLUMN     "savedGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
