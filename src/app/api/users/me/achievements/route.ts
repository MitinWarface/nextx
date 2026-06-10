/**
 * GET /api/users/me/achievements — returns user's unlocked achievements
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: user!.id },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: "desc" },
    });

    return ok({
      achievements: userAchievements.map((ua) => ({
        code: ua.achievement.code,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        unlockedAt: ua.unlockedAt.toISOString(),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
