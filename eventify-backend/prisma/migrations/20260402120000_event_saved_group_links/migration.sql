-- CreateTable
CREATE TABLE "EventSavedGroup" (
    "eventId" INTEGER NOT NULL,
    "savedGroupChatId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventSavedGroup_pkey" PRIMARY KEY ("eventId","savedGroupChatId")
);

-- CreateIndex
CREATE INDEX "EventSavedGroup_eventId_idx" ON "EventSavedGroup"("eventId");

-- AddForeignKey
ALTER TABLE "EventSavedGroup" ADD CONSTRAINT "EventSavedGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventSavedGroup" ADD CONSTRAINT "EventSavedGroup_savedGroupChatId_fkey" FOREIGN KEY ("savedGroupChatId") REFERENCES "SavedGroupChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Сохранённые группы для пар (создатель, chatId), которых ещё не было
INSERT INTO "SavedGroupChat" ("userId", "chatId", "label")
SELECT DISTINCT e."creatorId", trim(x.g), ''
FROM "Event" e
CROSS JOIN unnest(e."groupIds") AS x(g)
WHERE trim(x.g) <> ''
AND NOT EXISTS (
  SELECT 1 FROM "SavedGroupChat" s
  WHERE s."userId" = e."creatorId" AND s."chatId" = trim(x.g)
);

-- Связи событие ↔ SavedGroupChat (порядок из массива; дубликаты chatId в одном событии схлопываются по min(ord))
INSERT INTO "EventSavedGroup" ("eventId", "savedGroupChatId", "sortOrder")
SELECT e.id, s.id, (min(u.ord::int) - 1)::int
FROM "Event" e
CROSS JOIN LATERAL unnest(e."groupIds") WITH ORDINALITY AS u(chat_id, ord)
JOIN "SavedGroupChat" s ON s."userId" = e."creatorId" AND s."chatId" = trim(u.chat_id)
WHERE trim(u.chat_id) <> ''
GROUP BY e.id, s.id;

-- DropColumn
ALTER TABLE "Event" DROP COLUMN "groupIds";
