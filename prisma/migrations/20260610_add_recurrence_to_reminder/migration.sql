-- AlterTable: Add recurrence fields to Reminder
ALTER TABLE "Reminder" ADD COLUMN "recurrence" TEXT;
ALTER TABLE "Reminder" ADD COLUMN "nextRemindAt" TIMESTAMP(3);
