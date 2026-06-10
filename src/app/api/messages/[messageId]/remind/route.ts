/**
 * POST /api/messages/[messageId]/remind — create a reminder for a message
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const remindSchema = z.object({
  remindAt: z.string().datetime(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { messageId } = await params;
    const body = await parseJson(req, remindSchema);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { chatId: true, content: true },
    });
    if (!message) throw new HttpError(404, "message_not_found");

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: message.chatId, userId: user!.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    const remindAt = new Date(body.remindAt);
    if (remindAt <= new Date()) {
      throw new HttpError(400, "remind_at_must_be_future");
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: user!.id,
        messageId,
        chatId: message.chatId,
        remindAt,
        text: message.content
          ? message.content.slice(0, 200)
          : "Напоминание о сообщении",
      },
    });

    return ok({ reminder });
  } catch (err) {
    return fail(err);
  }
}
