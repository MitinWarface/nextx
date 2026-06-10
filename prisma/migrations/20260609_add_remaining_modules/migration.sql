-- CreateTable
CREATE TABLE "BusinessAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "website" VARCHAR(500),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "fileKey" VARCHAR(1000) NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" VARCHAR(200),
    "category" TEXT NOT NULL DEFAULT 'uploads',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalRequest" (
    "id" TEXT NOT NULL,
    "organization" VARCHAR(500) NOT NULL,
    "requestType" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "targetUserIds" TEXT[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referenceNumber" VARCHAR(200),
    "responseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channel" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500),
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessAccount_userId_key" ON "BusinessAccount"("userId");
CREATE INDEX "BusinessAccount_verified_idx" ON "BusinessAccount"("verified");
CREATE INDEX "ContentItem_userId_createdAt_idx" ON "ContentItem"("userId", "createdAt" DESC);
CREATE INDEX "ContentItem_category_idx" ON "ContentItem"("category");
CREATE INDEX "ContentItem_fileSize_idx" ON "ContentItem"("fileSize");
CREATE INDEX "LegalRequest_status_createdAt_idx" ON "LegalRequest"("status", "createdAt" DESC);
CREATE INDEX "NotificationLog_channel_createdAt_idx" ON "NotificationLog"("channel", "createdAt" DESC);
CREATE INDEX "NotificationLog_success_idx" ON "NotificationLog"("success");

-- AddForeignKey
ALTER TABLE "BusinessAccount" ADD CONSTRAINT "BusinessAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
