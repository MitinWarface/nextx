-- AlterTable: Chat
ALTER TABLE "Chat" ADD COLUMN "maxSubscribers" INTEGER;
ALTER TABLE "Chat" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
