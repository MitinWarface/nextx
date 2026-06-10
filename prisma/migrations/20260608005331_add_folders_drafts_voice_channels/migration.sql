-- CreateTable
CREATE TABLE "ChatFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Folder',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderChat" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "FolderChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceChannel" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isScreenShare" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatFolder_userId_idx" ON "ChatFolder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatFolder_userId_name_key" ON "ChatFolder"("userId", "name");

-- CreateIndex
CREATE INDEX "FolderChat_folderId_idx" ON "FolderChat"("folderId");

-- CreateIndex
CREATE INDEX "FolderChat_chatId_idx" ON "FolderChat"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderChat_folderId_chatId_key" ON "FolderChat"("folderId", "chatId");

-- CreateIndex
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");

-- CreateIndex
CREATE INDEX "Draft_chatId_idx" ON "Draft"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "Draft_userId_chatId_key" ON "Draft"("userId", "chatId");

-- CreateIndex
CREATE INDEX "VoiceChannel_chatId_idx" ON "VoiceChannel"("chatId");

-- CreateIndex
CREATE INDEX "VoiceSession_channel_id_idx" ON "VoiceSession"("channel_id");

-- CreateIndex
CREATE INDEX "VoiceSession_userId_idx" ON "VoiceSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceSession_channel_id_userId_key" ON "VoiceSession"("channel_id", "userId");

-- AddForeignKey
ALTER TABLE "ChatFolder" ADD CONSTRAINT "ChatFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderChat" ADD CONSTRAINT "FolderChat_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ChatFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderChat" ADD CONSTRAINT "FolderChat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceChannel" ADD CONSTRAINT "VoiceChannel_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "VoiceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
