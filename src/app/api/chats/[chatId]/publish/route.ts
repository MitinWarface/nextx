import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

const publishSchema = z.object({
  messageId: z.string(),
  publishAt: z.string().datetime(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    const body = await parseJson(req, publishSchema);

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true, creatorId: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "CHANNEL") throw new HttpError(400, "not_a_channel");

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
      select: { role: true },
    });
    if (!participant || (participant.role !== "OWNER" && participant.role !== "ADMIN")) {
      throw new HttpError(403, "not_channel_owner");
    }

    const message = await prisma.message.findUnique({
      where: { id: body.messageId },
      select: { id: true, chatId: true, senderId: true },
    });
    if (!message) throw new HttpError(404, "message_not_found");
    if (message.chatId !== chatId) throw new HttpError(400, "message_not_in_chat");

    const publishDate = new Date(body.publishAt);
    if (publishDate <= new Date()) throw new HttpError(400, "publish_at_must_be_future");

    const updated = await prisma.message.update({
      where: { id: body.messageId },
      data: {
        publishAt: publishDate,
        isScheduled: true,
      },
      select: { id: true, publishAt: true, isScheduled: true },
    });

    return ok({ message: updated });
  } catch (err) {
    return fail(err);
  }
}
