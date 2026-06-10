-- 1. AI Requests table
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "outputText" TEXT,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiRequest_userId_createdAt_idx" ON "AiRequest"("userId", "createdAt" DESC);
CREATE INDEX "AiRequest_requestType_createdAt_idx" ON "AiRequest"("requestType", "createdAt" DESC);
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. isReadOnly flag on User
ALTER TABLE "User" ADD COLUMN "isReadOnly" BOOLEAN NOT NULL DEFAULT false;
