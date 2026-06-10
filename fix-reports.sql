CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'FRAUD', 'ABUSE', 'PORN', 'VIOLENCE', 'FAKE', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN');

CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetMessageId" TEXT,
    "targetChatId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "description" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");
CREATE INDEX "Report_targetUserId_idx" ON "Report"("targetUserId");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt" DESC);

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
