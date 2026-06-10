/**
 * GET /api/chats/[chatId]/level — Returns community level info for a chat.
 * Fields: level, experience, levelUpThreshold, unlocks, progress, etc.
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getLevelInfo, getXPToNextLevel, COMMUNITY_LEVELS } from "@/lib/community-levels";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    if (!me) throw new HttpError(401, "unauthorized");

    const { chatId } = await params;

    // Verify user is a participant
    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        level: true,
        experience: true,
        levelUpThreshold: true,
      },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");

    const levelInfo = getLevelInfo(chat.experience);
    const xpToNext = getXPToNextLevel(chat.experience);

    return ok({
      chatId: chat.id,
      level: chat.level,
      experience: chat.experience,
      levelUpThreshold: chat.levelUpThreshold,
      progress: levelInfo.progress,
      xpToNextLevel: xpToNext,
      isMaxLevel: levelInfo.isMaxLevel,
      currentLevelInfo: levelInfo.info,
      nextLevelInfo: chat.level < 5 ? COMMUNITY_LEVELS[chat.level + 1] : null,
    });
  } catch (err) {
    return fail(err);
  }
}
