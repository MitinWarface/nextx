import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);

    if (chatId) {
      const entries = await prisma.leaderboard.findMany({
        where: { chatId },
        orderBy: [{ xp: "desc" }],
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      return ok({
        leaderboard: entries.map((e, i) => ({
          rank: i + 1,
          userId: e.userId,
          username: e.user.username,
          displayName: e.user.displayName,
          avatarUrl: e.user.avatarUrl,
          xp: e.xp,
          messages: e.messages,
          voiceMin: e.voiceMin,
          gifts: e.gifts,
          weekXp: e.weekXp,
        })),
      });
    }

    // Global leaderboard: aggregate across all chats
    const entries = await prisma.leaderboard.groupBy({
      by: ["userId"],
      _sum: { xp: true, messages: true, voiceMin: true, gifts: true, weekXp: true },
      orderBy: { _sum: { xp: "desc" } },
      take: limit,
    });

    const userIds = entries.map((e) => e.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return ok({
      leaderboard: entries.map((e, i) => {
        const u = userMap.get(e.userId);
        return {
          rank: i + 1,
          userId: e.userId,
          username: u?.username ?? null,
          displayName: u?.displayName ?? null,
          avatarUrl: u?.avatarUrl ?? null,
          xp: e._sum.xp ?? 0,
          messages: e._sum.messages ?? 0,
          voiceMin: e._sum.voiceMin ?? 0,
          gifts: e._sum.gifts ?? 0,
          weekXp: e._sum.weekXp ?? 0,
        };
      }),
    });
  } catch (err) {
    return fail(err);
  }
}
