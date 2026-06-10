-- 1. Feature Flags
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeatureFlag_code_key" ON "FeatureFlag"("code");

-- 2. Remote Config
CREATE TABLE "RemoteConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(500),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RemoteConfig_pkey" PRIMARY KEY ("key")
);

-- 3. Devices / Active Sessions
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" VARCHAR(200) NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "browser" VARCHAR(100),
    "ipAddress" VARCHAR(45),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "trustLevel" TEXT NOT NULL DEFAULT 'new',
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Device_userId_lastActivity_idx" ON "Device"("userId", "lastActivity" DESC);
CREATE INDEX "Device_userId_isRevoked_idx" ON "Device"("userId", "isRevoked");
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Security Events
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "device" VARCHAR(200),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt" DESC);
CREATE INDEX "SecurityEvent_type_createdAt_idx" ON "SecurityEvent"("type", "createdAt" DESC);
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Rate Limit Config
CREATE TABLE "RateLimitConfig" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "freeLimit" INTEGER NOT NULL,
    "premiumLimit" INTEGER NOT NULL,
    "windowMs" INTEGER NOT NULL DEFAULT 60000,
    CONSTRAINT "RateLimitConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RateLimitConfig_action_key" ON "RateLimitConfig"("action");

-- 6. Promo Codes
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "planId" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_isActive_expiresAt_idx" ON "PromoCode"("isActive", "expiresAt");
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. User Segments
CREATE TABLE "UserSegment" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "filter" JSONB NOT NULL,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSegment_pkey" PRIMARY KEY ("id")
);

-- 8. Admin Notes
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminNote_userId_createdAt_idx" ON "AdminNote"("userId", "createdAt" DESC);
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Login History
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" VARCHAR(45),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "device" VARCHAR(200),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt" DESC);
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Seed default feature flags
INSERT INTO "FeatureFlag" ("id", "code", "name", "description", "enabled", "rolloutPercent", "createdAt", "updatedAt") VALUES
('ff_stories', 'stories', 'Stories', 'Истории (Stories)', true, 100, NOW(), NOW()),
('ff_video_calls', 'video_calls', 'Video Calls', 'Видеозвонки', true, 100, NOW(), NOW()),
('ff_ai_chat', 'ai_chat', 'AI Chat', 'AI чат-бот', false, 0, NOW(), NOW()),
('ff_business', 'business_accounts', 'Business Accounts', 'Бизнес аккаунты', false, 0, NOW(), NOW()),
('ff_tasks', 'tasks', 'Tasks', 'Задачи в чатах', true, 100, NOW(), NOW()),
('ff_channels', 'channels', 'Channels', 'Каналы', true, 100, NOW(), NOW()),
('ff_bots', 'bots', 'Bots', 'Боты', true, 100, NOW(), NOW()),
('ff_gifts', 'gifts', 'Gifts', 'Подарки', true, 100, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 11. Seed default rate limits
INSERT INTO "RateLimitConfig" ("id", "action", "freeLimit", "premiumLimit", "windowMs") VALUES
('rl_messages', 'messages', 30, 120, 60000),
('rl_group_create', 'group_create', 5, 20, 60000),
('rl_channel_create', 'channel_create', 3, 10, 60000),
('rl_media_upload', 'media_upload', 10, 50, 60000),
('rl_reactions', 'reactions', 20, 100, 60000),
('rl_search', 'search', 15, 60, 60000)
ON CONFLICT (action) DO NOTHING;

-- 12. Seed default remote configs
INSERT INTO "RemoteConfig" ("key", "value", "description", "updatedAt") VALUES
('max_group_members', '200000', 'Максимум участников группы', NOW()),
('max_file_size_free', '10485760', 'Макс размер файла free (10MB)', NOW()),
('max_file_size_premium', '4294967296', 'Макс размер файла premium (4GB)', NOW()),
('max_channels_per_user', '10', 'Макс каналов на пользователя', NOW()),
('max_folders', '10', 'Макс папок', NOW()),
('typing_timeout_ms', '5000', 'Таймаут набора текста', NOW()),
('presence_ttl_seconds', '1800', 'TTL присутствия', NOW()),
('message_edit_timeout_ms', '86400000', 'Таймаут редактирования (24ч)', NOW())
ON CONFLICT (key) DO NOTHING;
