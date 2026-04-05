-- CreateTable
CREATE TABLE "SavedGroupChat" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SavedGroupChat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedGroupChat_userId_chatId_key" ON "SavedGroupChat"("userId", "chatId");

ALTER TABLE "SavedGroupChat" ADD CONSTRAINT "SavedGroupChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Перенос из User.savedGroupIds
INSERT INTO "SavedGroupChat" ("userId", "chatId", "label")
SELECT u."id", trim(both from g), ''
FROM "User" u
CROSS JOIN LATERAL unnest(u."savedGroupIds") AS g
WHERE trim(both from g) <> '';

ALTER TABLE "User" DROP COLUMN "savedGroupIds";
