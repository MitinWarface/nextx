-- Add TASK_LIST to MessageType enum
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'TASK_LIST';

-- SavedTag table
CREATE TABLE IF NOT EXISTS "SavedTag" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "tag" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedTag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SavedTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedTag_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedTag_userId_messageId_tag_key" UNIQUE ("userId", "messageId", "tag")
);
CREATE INDEX IF NOT EXISTS "SavedTag_userId_tag_idx" ON "SavedTag"("userId", "tag");
CREATE INDEX IF NOT EXISTS "SavedTag_messageId_idx" ON "SavedTag"("messageId");

-- TaskItem table
CREATE TABLE IF NOT EXISTS "TaskItem" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskItem_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TaskItem_messageId_idx" ON "TaskItem"("messageId");
