-- Premium system tables
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "priceKopecks" INTEGER NOT NULL,
  "isPopular" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Feature" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Feature_code_key" ON "Feature"("code");

CREATE TABLE IF NOT EXISTS "PlanFeature" (
  "planId" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("planId", "featureId"),
  CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE,
  CONSTRAINT "PlanFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "amountKopecks" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

-- Add premium fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumPlanId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_premiumPlanId_fkey" FOREIGN KEY ("premiumPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL;

-- Seed default plans
INSERT INTO "SubscriptionPlan" ("id", "name", "durationDays", "priceKopecks", "isPopular", "sortOrder", "createdAt") VALUES
  ('plan_monthly', 'Monthly', 30, 29900, false, 1, CURRENT_TIMESTAMP),
  ('plan_yearly', 'Yearly', 365, 199000, true, 2, CURRENT_TIMESTAMP),
  ('plan_2years', '2 Years', 730, 299000, false, 3, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Seed features
INSERT INTO "Feature" ("id", "code", "name") VALUES
  ('feat_voice_to_text', 'voice_to_text', 'Расшифровка голосовых'),
  ('feat_video_avatar', 'video_avatar', 'Видеоаватары'),
  ('feat_ai_rewrite', 'ai_rewrite', 'AI-функции'),
  ('feat_no_ads', 'no_ads', 'Без рекламы'),
  ('feat_large_upload', 'large_upload', 'Большие файлы (4 ГБ)'),
  ('feat_saved_tags', 'saved_tags', 'Теги в Избранном'),
  ('feat_task_lists', 'task_lists', 'Списки задач'),
  ('feat_premium_stickers', 'premium_stickers', 'Премиум-стикеры'),
  ('feat_premium_reactions', 'premium_reactions', 'Любые реакции'),
  ('feat_premium_badge', 'premium_badge', 'Премиум-значок')
ON CONFLICT ("id") DO NOTHING;

-- Link features to plans (all features for all plans)
INSERT INTO "PlanFeature" ("planId", "featureId")
SELECT p.id, f.id FROM "SubscriptionPlan" p, "Feature" f
ON CONFLICT DO NOTHING;
