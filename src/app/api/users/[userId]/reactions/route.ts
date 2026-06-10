/**
 * GET  /api/users/[userId]/reactions — list reactions grouped by emoji
 * POST /api/users/[userId]/reactions — toggle reaction
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

const toggleSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const reactions = await prisma.profileReaction.groupBy({
      by: ["emoji"],
      where: { targetId: userId },
      _count: { emoji: true },
    });

    const grouped = reactions.map((r) => ({
      emoji: r.emoji,
      count: r._count.emoji,
    }));

    return ok({ reactions: grouped });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { userId } = await params;
    const body = await parseJson(req, toggleSchema);

    if (user!.id === userId) {
      return fail({ status: 400, message: "Cannot react to yourself" });
    }

    const existing = await prisma.profileReaction.findUnique({
      where: {
        userId_targetId_emoji: {
          userId: user!.id,
          targetId: userId,
          emoji: body.emoji,
        },
      },
    });

    if (existing) {
      await prisma.profileReaction.delete({ where: { id: existing.id } });
      return ok({ removed: true });
    }

    const reaction = await prisma.profileReaction.create({
      data: {
        userId: user!.id,
        targetId: userId,
        emoji: body.emoji,
      },
    });

    return ok({ reaction });
  } catch (err) {
    return fail(err);
  }
}
