/**
 * GET /api/users/me/stats — unified user activity stats
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const userId = user!.id;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);

    const [
      messagesSent,
      messagesReceived,
      voiceSessions,
      cloudFiles,
      cloudStats,
      sentGifts,
      receivedGifts,
      createdChats,
      createdChannels,
      reactionsGiven,
      stickersUsed,
      participant,
    ] = await Promise.all([
      prisma.message.count({ where: { senderId: userId } }),
      prisma.message.count({
        where: {
          chat: { participants: { some: { userId } } },
          senderId: { not: userId },
        },
      }),
      prisma.voiceSession.findMany({
        where: { userId, leftAt: { not: null } },
        select: { joinedAt: true, leftAt: true },
      }),
      prisma.cloudFile.findMany({
        where: { userId },
        select: { size: true, createdAt: true },
      }),
      prisma.cloudFile.aggregate({
        where: { userId },
        _sum: { size: true },
        _count: true,
      }),
      prisma.gift.count({ where: { senderId: userId } }),
      prisma.gift.count({ where: { receiverId: userId } }),
      prisma.chat.count({ where: { creatorId: userId, type: "GROUP" } }),
      prisma.chat.count({ where: { creatorId: userId, type: "CHANNEL" } }),
      prisma.reaction.count({ where: { userId } }),
      prisma.message.count({
        where: { senderId: userId, type: "STICKER" },
      }),
      prisma.participant.findMany({
        where: { userId },
        select: { joinedAt: true },
      }),
    ]);

    const callMinutes = voiceSessions.reduce((acc, s) => {
      if (!s.leftAt) return acc;
      return acc + Math.round((s.leftAt.getTime() - s.joinedAt.getTime()) / 60_000);
    }, 0);

    const storageUsed = cloudStats._sum.size ?? 0;

    // Days active: count unique days with sent messages
    const sentDays = await prisma.message.findMany({
      where: { senderId: userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 365,
    });
    const uniqueDays = new Set(
      sentDays.map((m) => m.createdAt.toISOString().slice(0, 10)),
    );
    const daysActive = uniqueDays.size;

    // Longest streak
    const sortedDays = [...uniqueDays].sort().reverse();
    let longestStreak = 0;
    let currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400_000;
      if (diff === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    return ok({
      messagesSent,
      messagesReceived,
      callsMade: voiceSessions.length,
      callMinutes,
      filesUploaded: cloudStats._count,
      storageUsed,
      giftsSent: sentGifts,
      giftsReceived: receivedGifts,
      groupsCreated: createdChats,
      channelsCreated: createdChannels,
      stickersUsed,
      reactionsGiven,
      daysActive,
      longestStreak,
    });
  } catch (err) {
    return fail(err);
  }
}
