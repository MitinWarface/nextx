-- CreateEnum
CREATE TYPE "PrivacyMode" AS ENUM ('EVERYONE', 'CONTACTS', 'NOBODY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'LOCATION';
ALTER TYPE "MessageType" ADD VALUE 'CONTACT';
ALTER TYPE "MessageType" ADD VALUE 'POLL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INCOMING_CALL';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_REPLY';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "keyboard" JSONB,
ADD COLUMN     "linkDescription" TEXT,
ADD COLUMN     "linkImage" TEXT,
ADD COLUMN     "linkSiteName" TEXT,
ADD COLUMN     "linkTitle" TEXT,
ADD COLUMN     "linkUrl" TEXT,
ADD COLUMN     "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "highlightName" TEXT;

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "multiChoice" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3),

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" VARCHAR(200) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatInvite" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "userId" TEXT NOT NULL,
    "profileVisibility" "PrivacyMode" NOT NULL DEFAULT 'EVERYONE',
    "lastSeenVisibility" "PrivacyMode" NOT NULL DEFAULT 'EVERYONE',
    "onlineVisibility" "PrivacyMode" NOT NULL DEFAULT 'EVERYONE',
    "readReceipts" BOOLEAN NOT NULL DEFAULT true,
    "messagePermission" "PrivacyMode" NOT NULL DEFAULT 'EVERYONE',
    "callPermission" "PrivacyMode" NOT NULL DEFAULT 'EVERYONE',
    "groupAddPermission" "PrivacyMode" NOT NULL DEFAULT 'EVERYONE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poll_messageId_key" ON "Poll"("messageId");

-- CreateIndex
CREATE INDEX "PollOption_pollId_order_idx" ON "PollOption"("pollId", "order");

-- CreateIndex
CREATE INDEX "PollVote_pollId_idx" ON "PollVote"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_userId_optionId_key" ON "PollVote"("pollId", "userId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatInvite_code_key" ON "ChatInvite"("code");

-- CreateIndex
CREATE INDEX "ChatInvite_chatId_idx" ON "ChatInvite"("chatId");

-- CreateIndex
CREATE INDEX "ChatInvite_code_idx" ON "ChatInvite"("code");

-- CreateIndex
CREATE INDEX "Story_authorId_highlightName_idx" ON "Story"("authorId", "highlightName");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatInvite" ADD CONSTRAINT "ChatInvite_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatInvite" ADD CONSTRAINT "ChatInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
