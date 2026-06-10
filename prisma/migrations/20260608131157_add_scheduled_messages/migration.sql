-- AlterTable: Message
ALTER TABLE "Message" ADD COLUMN "scheduledFor" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "isScheduled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Message_scheduledFor_idx" ON "Message"("scheduledFor") WHERE "isScheduled" = true;
