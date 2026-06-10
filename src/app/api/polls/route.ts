/**
 * GET  /api/polls?messageId=... — get poll by message ID
 * POST /api/polls               — create a new poll (attached to a message)
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

const createSchema = z.object({
  messageId: z.string().min(1),
  question: z.string().min(1).max(500),
  type: z.enum(["regular", "anonymous", "referendum"]).default("regular"),
  multiChoice: z.boolean().default(false),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");
    if (!messageId) throw new HttpError(400, "messageId_required");

    const poll = await prisma.poll.findUnique({
      where: { messageId },
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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "invalid_json");
    const parsed = createSchema.parse(body);

    const message = await prisma.message.findUnique({ where: { id: parsed.messageId } });
    if (!message) throw new HttpError(404, "message_not_found");
    if (message.senderId !== user!.id) throw new HttpError(403, "not_message_owner");

    const existing = await prisma.poll.findUnique({ where: { messageId: parsed.messageId } });
    if (existing) throw new HttpError(409, "poll_already_exists");

    const poll = await prisma.poll.create({
      data: {
        messageId: parsed.messageId,
        creatorId: user!.id,
        question: parsed.question,
        type: parsed.type,
        multiChoice: parsed.multiChoice,
        closesAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
        options: {
          create: parsed.options.map((text, i) => ({ text, order: i })),
        },
      },
      include: { options: { orderBy: { order: "asc" } } },
    });

    return created({ poll });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
