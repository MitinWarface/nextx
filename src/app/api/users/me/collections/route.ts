/**
 * GET /api/users/me/collections — unified collections view
 * Returns gifts, stickers, achievements, frames, backgrounds, badges
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    // Fetch all collection data in parallel
    const [gifts, stickerPacks, achievements, shopPurchases] = await Promise.all([
      // Gifts received
      prisma.gift.findMany({
        where: { receiverId: user!.id, status: { in: ["DELIVERED", "ACCEPTED"] } },
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      // Installed sticker packs
      prisma.stickerPack.findMany({
        where: {
          OR: [
            { stickers: { some: { ownerId: user!.id } } },
            { authorId: user!.id },
          ],
        },
        include: {
          stickers: { take: 5, select: { id: true, mediaUrl: true, emoji: true } },
          author: { select: { id: true, username: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      // Achievements
      prisma.userAchievement.findMany({
        where: { userId: user!.id },
        include: { achievement: true },
        orderBy: { unlockedAt: "desc" },
      }),

      // Shop purchases (frames, backgrounds, badges stored as payments with categories)
      prisma.payment.findMany({
        where: { userId: user!.id, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    // Categorize shop purchases
    const frames = shopPurchases.filter((p) => {
      const desc = (p as Record<string, unknown>).description;
      return typeof desc === "string" && desc.includes("frame");
    });
    const backgrounds = shopPurchases.filter((p) => {
      const desc = (p as Record<string, unknown>).description;
      return typeof desc === "string" && desc.includes("background");
    });
    const badges = shopPurchases.filter((p) => {
      const desc = (p as Record<string, unknown>).description;
      return typeof desc === "string" && desc.includes("badge");
    });

    return ok({
      gifts: gifts.map((g) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        type: g.type,
        rarity: g.rarity,
        price: g.price,
        message: g.message,
        sender: g.sender,
        createdAt: g.createdAt.toISOString(),
      })),
      stickers: stickerPacks.map((sp) => ({
        id: sp.id,
        name: sp.name,
        description: sp.description,
        emoji: sp.emoji,
        isPublic: sp.isPublic,
        stickerCount: sp.stickers.length,
        stickers: sp.stickers,
        author: sp.author,
        createdAt: sp.createdAt.toISOString(),
      })),
      achievements: achievements.map((ua) => ({
        id: ua.achievement.id,
        code: ua.achievement.code,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        unlockedAt: ua.unlockedAt.toISOString(),
      })),
      frames: frames.map((f) => ({
        id: f.id,
        provider: f.provider,
        amount: f.amountKopecks,
        createdAt: f.createdAt.toISOString(),
      })),
      backgrounds: backgrounds.map((b) => ({
        id: b.id,
        provider: b.provider,
        amount: b.amountKopecks,
        createdAt: b.createdAt.toISOString(),
      })),
      badges: badges.map((b) => ({
        id: b.id,
        provider: b.provider,
        amount: b.amountKopecks,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
