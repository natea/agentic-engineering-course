-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imessageId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT,
    "isFromMe" BOOLEAN NOT NULL DEFAULT false,
    "text" TEXT,
    "attachments" TEXT,
    "sentAt" DATETIME NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedForPost" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Message" ("attachments", "chatId", "id", "imessageId", "processedForPost", "senderId", "senderName", "sentAt", "syncedAt", "text") SELECT "attachments", "chatId", "id", "imessageId", "processedForPost", "senderId", "senderName", "sentAt", "syncedAt", "text" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_imessageId_key" ON "Message"("imessageId");
CREATE INDEX "Message_chatId_sentAt_idx" ON "Message"("chatId", "sentAt");
CREATE INDEX "Message_processedForPost_idx" ON "Message"("processedForPost");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
