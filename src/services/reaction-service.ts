/**
 * Бизнес-логика реакций: добавить, удалить, агрегировать.
 */
import { prisma } from "@/lib/prisma";
import { publishNewMessage } from "@/lib/redis";
import { HttpError } from "@/lib/api-helpers";
import type { ReactionSummary } from "@/types";

const MAX_EMOJI_LEN = 16; // с запасом на ZWJ-sequences

function normalizeEmoji(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new HttpError(400, "empty_emoji");
  if (trimmed.length > MAX_EMOJI_LEN) throw new HttpError(400, "emoji_too_long");
  return trimmed;
}

export async function addReaction(input: {
  messageId: string;
  userId: string;
  emoji: string;
}): Promise<ReactionSummary[]> {
  const emoji = normalizeEmoji(input.emoji);
  const message = await prisma.message.findUnique({
    where: { id: input.messageId },
    select: { chatId: true, isDeleted: true },
  });
  if (!message || message.isDeleted) throw new HttpError(404, "message_not_found");

  // Проверяем, что юзер — участник чата
  const participant = await prisma.participant.findUnique({
    where: { chatId_userId: { chatId: message.chatId, userId: input.userId } },
  });
  if (!participant) throw new HttpError(403, "not_a_participant");

  await prisma.reaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId: input.messageId,
        userId: input.userId,
        emoji,
      },
    },
    create: { messageId: input.messageId, userId: input.userId, emoji },
    update: {},
  });

  const summary = await getReactionsForMessage(input.messageId);
  await publishNewMessage(message.chatId, {
    _event: "reaction",
    chatId: message.chatId,
    messageId: input.messageId,
    reactions: summary,
  } as unknown as Parameters<typeof publishNewMessage>[1]);
  return summary;
}

export async function removeReaction(input: {
  messageId: string;
  userId: string;
  emoji: string;
}): Promise<ReactionSummary[]> {
  const emoji = normalizeEmoji(input.emoji);
  const message = await prisma.message.findUnique({
    where: { id: input.messageId },
    select: { chatId: true },
  });
  if (!message) throw new HttpError(404, "message_not_found");

  await prisma.reaction.deleteMany({
    where: {
      messageId: input.messageId,
      userId: input.userId,
      emoji,
    },
  });

  const summary = await getReactionsForMessage(input.messageId);
  await publishNewMessage(message.chatId, {
    _event: "reaction",
    chatId: message.chatId,
    messageId: input.messageId,
    reactions: summary,
  } as unknown as Parameters<typeof publishNewMessage>[1]);
  return summary;
}

export async function getReactionsForMessage(
  messageId: string,
): Promise<ReactionSummary[]> {
  const rows = await prisma.reaction.findMany({
    where: { messageId },
    select: { emoji: true, userId: true },
  });
  const map = new Map<string, ReactionSummary>();
  for (const r of rows) {
    const cur = map.get(r.emoji);
    if (cur) {
      cur.count += 1;
      cur.userIds.push(r.userId);
    } else {
      map.set(r.emoji, { emoji: r.emoji, count: 1, userIds: [r.userId] });
    }
  }
  return Array.from(map.values());
}

/**
 * Батч-запрос: получить реакции для списка сообщений одним запросом.
 */
export async function getReactionsForMessages(
  messageIds: string[],
): Promise<Map<string, ReactionSummary[]>> {
  const map = new Map<string, ReactionSummary[]>();
  if (messageIds.length === 0) return map;
  const rows = await prisma.reaction.findMany({
    where: { messageId: { in: messageIds } },
    select: { messageId: true, emoji: true, userId: true },
  });
  for (const id of messageIds) map.set(id, []);
  for (const r of rows) {
    const list = map.get(r.messageId)!;
    const cur = list.find((x) => x.emoji === r.emoji);
    if (cur) {
      cur.count += 1;
      cur.userIds.push(r.userId);
    } else {
      list.push({ emoji: r.emoji, count: 1, userIds: [r.userId] });
    }
  }
  return map;
}
