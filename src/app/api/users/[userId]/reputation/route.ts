import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const voteSchema = z.object({
  score: z.number().int().min(1).max(5),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const voter = currentUser!;
    const { userId: targetId } = await params;
    const body = await parseJson(req, voteSchema);

    if (voter.id === targetId) {
      throw new HttpError(400, "cannot_vote_yourself");
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    const existing = await prisma.reputationVote.findUnique({
      where: { voterId_targetId: { voterId: voter.id, targetId } },
    });

    if (existing) {
      if (existing.score === body.score) {
        return ok({ message: "vote_unchanged", score: existing.score });
      }
      await prisma.reputationVote.update({
        where: { id: existing.id },
        data: { score: body.score },
      });
    } else {
      await prisma.reputationVote.create({
        data: { voterId: voter.id, targetId, score: body.score },
      });
    }

    const aggregate = await prisma.reputationVote.aggregate({
      where: { targetId },
      _avg: { score: true },
    });

    const avg = aggregate._avg.score ?? 0;
    const rounded = Math.round(avg * 100) / 100;

    await prisma.user.update({
      where: { id: targetId },
      data: { reputation: rounded },
    });

    return ok({ reputation: rounded });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetId } = await params;

    const aggregate = await prisma.reputationVote.aggregate({
      where: { targetId },
      _avg: { score: true },
      _count: { score: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { reputation: true },
    });
    if (!user) throw new HttpError(404, "user_not_found");

    return ok({
      reputation: user.reputation,
      votesCount: aggregate._count.score,
      average: aggregate._avg.score ?? 0,
    });
  } catch (err) {
    return fail(err);
  }
}
