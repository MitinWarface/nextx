/**
 * POST /api/seasonal/[eventId]/claim — claim rewards from a seasonal event
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError, requireUser } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const user = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { eventId } = await params;

    const event = await prisma.seasonalEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new HttpError(404, "event_not_found");

    const now = new Date();
    if (now > event.endsAt) {
      throw new HttpError(400, "event_ended");
    }

    const rewards = event.rewards as Record<string, unknown> | null;
    if (!rewards) {
      throw new HttpError(400, "no_rewards_available");
    }

    // Award achievement badge if event has badge rewards
    const badges = (rewards.badges as string[]) ?? [];
    for (const badgeCode of badges) {
      const achievement = await prisma.achievement.findUnique({
        where: { code: badgeCode },
      });
      if (achievement) {
        await prisma.userAchievement.upsert({
          where: {
            userId_achievementId: { userId: user!.id, achievementId: achievement.id },
          },
          create: { userId: user!.id, achievementId: achievement.id },
          update: {},
        });
      }
    }

    return ok({
      claimed: true,
      eventId,
      rewards: {
        frames: (rewards.frames as string[]) ?? [],
        badges,
        gifts: (rewards.gifts as string[]) ?? [],
      },
    });
  } catch (err) {
    return fail(err);
  }
}
