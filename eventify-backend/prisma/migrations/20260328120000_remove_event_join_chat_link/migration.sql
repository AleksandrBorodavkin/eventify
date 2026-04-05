-- Drop column; pre-launch, no backward compatibility needed.
ALTER TABLE "Event" DROP COLUMN IF EXISTS "joinChatLink";
