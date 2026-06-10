/**
 * GET  /api/polls/[pollId]  — get poll with results
 * PATCH /api/polls/[pollId] — close/update poll
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
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!poll) throw new HttpError(404, "not_found");

    const results = poll.options.map((o) => ({
      optionId: o.id,
      text: o.text,
      count: o.votes.reduce((sum, v) => sum + v.weight, 0),
      userIds: poll.type !== "anonymous" ? o.votes.map((v) => v.userId) : [],
    }));
    const totalVotes = results.reduce((sum, r) => sum + r.count, 0);
    const voted = poll.options.some((o) => o.votes.some((v) => v.userId === user!.id));

    return ok({
      poll: {
        id: poll.id,
        question: poll.question,
        type: poll.type,
        multiChoice: poll.multiChoice,
        isClosed: poll.isClosed,
        closesAt: poll.closesAt,
        createdAt: poll.createdAt,
        creator: poll.creator,
      },
      results,
      totalVotes,
      voted,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { pollId } = await params;
    const body = await req.json().catch(() => ({}));

    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw new HttpError(404, "not_found");
    if (poll.creatorId !== user!.id) throw new HttpError(403, "not_creator");

    const updated = await prisma.poll.update({
      where: { id: pollId },
      data: {
        ...(body.isClosed !== undefined && { isClosed: body.isClosed }),
        ...(body.question !== undefined && { question: body.question }),
      },
    });
    return ok({ poll: updated });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
