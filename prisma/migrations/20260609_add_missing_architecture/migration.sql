-- AlterTable: Add phone, isPermabanned, sessionCleanupDays to User
ALTER TABLE "User" ADD COLUMN "phone" VARCHAR(20);
ALTER TABLE "User" ADD COLUMN "isPermabanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "sessionCleanupDays" INTEGER;

-- CreateIndex for phone (partial unique — skip nulls)
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone") WHERE "phone" IS NOT NULL;

-- AlterTable: Add deletedAt to Message
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add delivered, opened to NotificationLog
ALTER TABLE "NotificationLog" ADD COLUMN "delivered" BOOLEAN;
ALTER TABLE "NotificationLog" ADD COLUMN "opened" BOOLEAN;

-- CreateTable: BusinessEmployee
CREATE TABLE "BusinessEmployee" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BusinessSubscription
CREATE TABLE "BusinessSubscription" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "planName" VARCHAR(100) NOT NULL,
    "priceKopecks" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessEmployee_accountId_userId_key" ON "BusinessEmployee"("accountId", "userId");
CREATE INDEX "BusinessEmployee_accountId_idx" ON "BusinessEmployee"("accountId");
CREATE INDEX "BusinessEmployee_userId_idx" ON "BusinessEmployee"("userId");
CREATE INDEX "BusinessSubscription_accountId_idx" ON "BusinessSubscription"("accountId");
CREATE INDEX "BusinessSubscription_isActive_idx" ON "BusinessSubscription"("isActive");

-- AddForeignKey
ALTER TABLE "BusinessEmployee" ADD CONSTRAINT "BusinessEmployee_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessEmployee" ADD CONSTRAINT "BusinessEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
