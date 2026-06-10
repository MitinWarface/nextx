-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedAt" TIMESTAMP(3),
ADD COLUMN     "pinnedById" TEXT;

-- CreateIndex
CREATE INDEX "Message_chatId_isPinned_pinnedAt_idx" ON "Message"("chatId", "isPinned", "pinnedAt" DESC);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
