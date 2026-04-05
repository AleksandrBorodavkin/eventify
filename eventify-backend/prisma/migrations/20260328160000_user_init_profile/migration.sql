-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "languageCode" TEXT,
ADD COLUMN     "isPremium" BOOLEAN,
ADD COLUMN     "isBot" BOOLEAN,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "allowsWriteToPm" BOOLEAN,
ADD COLUMN     "addedToAttachmentMenu" BOOLEAN,
ADD COLUMN     "initProfileUpdatedAt" TIMESTAMPTZ;
