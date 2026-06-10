/**
 * POST /api/messages/callback  — handle inline-keyboard button click
 * Body: { messageId: string, data: string }
 * Routes callback_data to the appropriate handler based on prefix.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { withRateLimit } from "@/lib/api-helpers/rate-limit-wrapper";
import { RATE_LIMITS } from "@/lib/rate-limit";

const schema = z.object({
  messageId: z.string().min(1),
  data: z.string().min(1).max(256),
});

async function handleVote(messageId: string, userId: string, data: string) {
  // data format: "vote:optionId"
  const optionId = data.split(":")[1];
  if (!optionId) throw new HttpError(400, "invalid_vote_data");

  const poll = await prisma.poll.findUnique({
    where: { messageId },
    include: { options: true },
  });
  if (!poll) throw new HttpError(400, "not_a_poll");
  if (poll.isClosed) throw new HttpError(400, "poll_closed");

  const targetOption = poll.options.find((o) => o.id === optionId);
  if (!targetOption) throw new HttpError(404, "option_not_found");

  // Remove previous vote from this user on this poll
  await prisma.pollVote.deleteMany({
    where: { pollId: poll.id, userId },
  });

  // Add new vote
  await prisma.pollVote.create({
    data: { pollId: poll.id, optionId, userId },
  });

  return { voted: optionId };
}

async function handleAction(messageId: string, userId: string, data: string) {
  // data format: "action:some_action"
  const action = data.split(":")[1];
  // Placeholder for bot flow actions (e.g., "action:start", "action:confirm_order")
  return { action, acknowledged: true };
}

export const POST = withRateLimit(async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await parseJson(req, schema);

    const message = await prisma.message.findUnique({
      where: { id: body.messageId },
      select: { chatId: true },
    });
    if (!message) throw new HttpError(404, "message_not_found");

    const me = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: message.chatId, userId: user!.id } },
      select: { id: true },
    });
    if (!me) throw new HttpError(403, "not_a_participant");

    let result: Record<string, unknown>;

    if (body.data.startsWith("vote:")) {
      result = await handleVote(body.messageId, user!.id, body.data);
    } else if (body.data.startsWith("action:")) {
      result = await handleAction(body.messageId, user!.id, body.data);
    } else {
      result = { data: body.data, acknowledged: true };
    }

    return ok({ handled: true, ...result });
  } catch (err) {
    return fail(err);
  }
}, RATE_LIMITS.messages);
