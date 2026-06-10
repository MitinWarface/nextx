/**
 * POST /api/messages/[messageId]/vote  — проголосовать за опцию опроса
 * Body: { optionId: string }
 *
 * Если голос уже стоит за эту опцию — снимает (toggle).
 * Если multiChoice=false — удаляет предыдущий голос этого пользователя.
 * После голосования эмитит poll:updated в socket.io.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const schema = z.object({ optionId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { messageId } = await params;
    const body = await parseJson(req, schema);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { chatId: true, poll: { select: { id: true, multiChoice: true, isClosed: true } } },
    });
    if (!message?.poll) throw new HttpError(404, "poll_not_found");
    if (message.poll.isClosed) throw new HttpError(400, "poll_closed");

    // Проверяем, что опция принадлежит этому опросу
    const option = await prisma.pollOption.findFirst({
      where: { id: body.optionId, pollId: message.poll.id },
    });
    if (!option) throw new HttpError(400, "invalid_option");

    // Проверяем участие в чате
    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: message.chatId, userId: user!.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    // Toggle: если уже голосовал за эту опцию — удаляем
    const existing = await prisma.pollVote.findFirst({
      where: { pollId: message.poll.id, userId: user!.id, optionId: body.optionId },
    });

    if (existing) {
      await prisma.pollVote.delete({ where: { id: existing.id } });
    } else {
      // Если не multiChoice — удаляем предыдущий голос
      if (!message.poll.multiChoice) {
        await prisma.pollVote.deleteMany({ where: { pollId: message.poll.id, userId: user!.id } });
      }
      await prisma.pollVote.create({
        data: { pollId: message.poll.id, optionId: body.optionId, userId: user!.id },
      });
    }

    // Получаем обновлённые результаты
    const poll = await prisma.poll.findUnique({
      where: { id: message.poll.id },
      include: {
        options: {
          orderBy: { order: "asc" },
          include: {
            votes: { select: { userId: true } },
          },
        },
      },
    });

    const results = poll?.options.map((o) => ({
      optionId: o.id,
      text: o.text,
      count: o.votes.length,
      userIds: o.votes.map((v) => v.userId),
    })) ?? [];

    // Publish poll:updated via Redis pub/sub for multi-server support
    try {
      const { default: Redis } = await import("ioredis");
      const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
      await redis.publish(
        `pubsub:chat:${message.chatId}`,
        JSON.stringify({
          _event: "poll",
          chatId: message.chatId,
          messageId,
          pollId: message.poll.id,
          results,
          totalVotes: results.reduce((sum: number, r: any) => sum + r.count, 0),
        }),
      );
      redis.disconnect();
    } catch { /* noop */ }

    return ok({ results, voted: !existing });
  } catch (err) {
    return fail(err);
  }
}
