/**
 * GET /api/users/me/inventory — all owned items grouped by type
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const [gifts, stickerPacks, achievements] = await Promise.all([
      prisma.gift.findMany({
        where: { receiverId: user!.id, status: { in: ["SENT", "DELIVERED", "ACCEPTED"] } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          emoji: true,
          type: true,
          rarity: true,
          price: true,
          createdAt: true,
          sender: { select: { displayName: true, username: true } },
        },
      }),
      prisma.stickerPack.findMany({
        where: {
          OR: [
            { authorId: user!.id },
            { id: { in: (await prisma.user.findUnique({ where: { id: user!.id }, select: { installedStickerPackIds: true } }))?.installedStickerPackIds ?? [] } },
          ],
        },
        select: {
          id: true,
          name: true,
          emoji: true,
          isPremium: true,
          _count: { select: { stickers: true } },
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId: user!.id },
        include: { achievement: { select: { id: true, code: true, name: true, description: true, icon: true, category: true } } },
        orderBy: { unlockedAt: "desc" },
      }),
    ]);

    return ok({
      gifts: gifts.map((g) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        type: g.type,
        rarity: g.rarity,
        price: g.price,
        from: g.sender.displayName,
        date: g.createdAt,
      })),
      stickerPacks: stickerPacks.map((sp) => ({
        id: sp.id,
        name: sp.name,
        emoji: sp.emoji,
        isPremium: sp.isPremium,
        stickerCount: sp._count.stickers,
      })),
      badges: achievements.map((ua) => ({
        id: ua.achievement.id,
        code: ua.achievement.code,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        unlockedAt: ua.unlockedAt,
      })),
      frames: [],
      backgrounds: [],
    });
  } catch (err) {
    return fail(err);
  }
}
