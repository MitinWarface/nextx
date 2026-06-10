/**
 * POST /api/stories/[id]/reply — ответить автору сторис в личку
 * Body: { content: string }
 * Создаёт (или находит) PRIVATE чат с автором и отправляет туда сообщение.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { getOrCreatePrivateChat } from "@/services/chat-service";
import { sendMessage } from "@/services/message-service";

const schema = z.object({
  content: z.string().min(1).max(2000),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { id: storyId } = await ctx.params;
    const body = await parseJson(req, schema);

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, authorId: true },
    });
    if (!story) throw new HttpError(404, "story_not_found");
    if (story.authorId === user!.id) {
      throw new HttpError(400, "cannot_reply_to_own_story");
    }

    // 1. Найти/создать PRIVATE чат
    const chat = await getOrCreatePrivateChat({
      userId: user!.id,
      otherUserId: story.authorId,
    });

    // 2. Отправить сообщение с пометкой о сторис
    const message = await sendMessage({
      chatId: chat.id,
      senderId: user!.id,
      type: "TEXT",
      content: body.content.trim(),
    });

    return ok({ chatId: chat.id, message });
  } catch (err) {
    return fail(err);
  }
}
