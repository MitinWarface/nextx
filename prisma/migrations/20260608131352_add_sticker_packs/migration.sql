-- CreateTable
CREATE TABLE "StickerPack" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "emoji" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StickerPack_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Sticker
ALTER TABLE "Sticker" ADD COLUMN "packId" TEXT;

-- CreateIndex
CREATE INDEX "StickerPack_authorId_idx" ON "StickerPack"("authorId");
CREATE INDEX "StickerPack_isPublic_idx" ON "StickerPack"("isPublic");

-- CreateIndex
CREATE INDEX "Sticker_packId_idx" ON "Sticker"("packId");

-- AddForeignKey
ALTER TABLE "StickerPack" ADD CONSTRAINT "StickerPack_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_packId_fkey" FOREIGN KEY ("packId") REFERENCES "StickerPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
