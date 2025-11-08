-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imessageId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT,
    "text" TEXT,
    "attachments" TEXT,
    "sentAt" DATETIME NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedForPost" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "threadStartTime" DATETIME NOT NULL,
    "threadEndTime" DATETIME NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PostMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "postId" INTEGER NOT NULL,
    "messageId" INTEGER NOT NULL,
    CONSTRAINT "PostMessage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_imessageId_key" ON "Message"("imessageId");

-- CreateIndex
CREATE INDEX "Message_chatId_sentAt_idx" ON "Message"("chatId", "sentAt");

-- CreateIndex
CREATE INDEX "Message_processedForPost_idx" ON "Message"("processedForPost");

-- CreateIndex
CREATE INDEX "BlogPost_status_createdAt_idx" ON "BlogPost"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostMessage_postId_messageId_key" ON "PostMessage"("postId", "messageId");
