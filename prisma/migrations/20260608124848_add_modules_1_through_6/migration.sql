-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_BAN', 'USER_UNBAN', 'USER_ROLE_CHANGE', 'USER_DELETE', 'CHAT_DELETE', 'CHAT_MEMBER_REMOVE', 'MESSAGE_DELETE', 'BOT_CREATE', 'BOT_DELETE', 'SETTINGS_CHANGE');

-- CreateEnum
CREATE TYPE "GiftStatus" AS ENUM ('SENT', 'DELIVERED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'GIFT_SENT', 'GIFT_RECEIVED', 'TOPUP');

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "botToken" TEXT;
ALTER TABLE "User" ADD COLUMN "webhookUrl" TEXT;

-- CreateUniqueIndex for botToken
CREATE UNIQUE INDEX "User_botToken_key" ON "User"("botToken");

-- AlterTable: Message (hlsUrl)
ALTER TABLE "Message" ADD COLUMN "hlsUrl" TEXT;

-- CreateIndex for Message
CREATE INDEX "Message_chatId_senderId_idx" ON "Message"("chatId", "senderId");

-- CreateTable: SecretChat
CREATE TABLE "SecretChat" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "chatId" TEXT,
    "publicKey1" TEXT NOT NULL DEFAULT '',
    "publicKey2" TEXT NOT NULL DEFAULT '',
    "sharedSecret" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for SecretChat
CREATE UNIQUE INDEX "SecretChat_chatId_key" ON "SecretChat"("chatId");
CREATE UNIQUE INDEX "SecretChat_user1Id_user2Id_key" ON "SecretChat"("user1Id", "user2Id");
CREATE INDEX "SecretChat_user1Id_idx" ON "SecretChat"("user1Id");
CREATE INDEX "SecretChat_user2Id_idx" ON "SecretChat"("user2Id");

-- AddForeignKey: SecretChat
ALTER TABLE "SecretChat" ADD CONSTRAINT "SecretChat_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecretChat" ADD CONSTRAINT "SecretChat_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecretChat" ADD CONSTRAINT "SecretChat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: Bot
CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "username" TEXT NOT NULL,
    "description" VARCHAR(300),
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for Bot
CREATE UNIQUE INDEX "Bot_username_key" ON "Bot"("username");
CREATE INDEX "Bot_creatorId_idx" ON "Bot"("creatorId");
CREATE INDEX "Bot_username_idx" ON "Bot"("username");

-- AddForeignKey: Bot
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetId" TEXT,
    "target" VARCHAR(100),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for AuditLog
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt" DESC);
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt" DESC);

-- AddForeignKey: AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Wallet
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NextCoin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for Wallet
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- AddForeignKey: Wallet
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Transaction
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for Transaction
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt" DESC);

-- AddForeignKey: Transaction
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Gift
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "chatId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "name" VARCHAR(100) NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🎁',
    "price" INTEGER NOT NULL DEFAULT 0,
    "status" "GiftStatus" NOT NULL DEFAULT 'SENT',
    "message" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for Gift
CREATE INDEX "Gift_senderId_createdAt_idx" ON "Gift"("senderId", "createdAt" DESC);
CREATE INDEX "Gift_receiverId_createdAt_idx" ON "Gift"("receiverId", "createdAt" DESC);

-- AddForeignKey: Gift
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SupportTicket
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for SupportTicket
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt" DESC);
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt" DESC);

-- AddForeignKey: SupportTicket
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
