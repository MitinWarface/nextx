/**
 * GET /api/polls/[pollId]/results — get poll results with percentages
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { pollId } = await params;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { order: "asc" },
          include: { votes: { select: { userId: true, weight: true } } },
        },
      },
    });
    if (!poll) throw new HttpError(404, "not_found");

    const results = poll.options.map((o) => {
      const count = o.votes.reduce((sum, v) => sum + v.weight, 0);
      return {
        optionId: o.id,
        text: o.text,
        count,
        percentage: 0,
        userIds: poll.type !== "anonymous" ? o.votes.map((v) => v.userId) : [],
      };
    });
    const totalVotes = results.reduce((sum, r) => sum + r.count, 0);

    for (const r of results) {
      r.percentage = totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
    }

    const voted = poll.options.some((o) => o.votes.some((v) => v.userId === user!.id));

    return ok({
      pollId: poll.id,
      question: poll.question,
      type: poll.type,
      isClosed: poll.isClosed,
      totalVotes,
      results,
      voted,
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
