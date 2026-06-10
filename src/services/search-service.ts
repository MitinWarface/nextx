/**
 * Бизнес-логика глобального поиска сообщений с FTS + фильтрами.
 * Использует PostgreSQL full-text search через raw query для ts_rank.
 */
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api-helpers";
import { toMessageDTO } from "./chat-service";
import { getReactionsForMessages } from "./reaction-service";
import type { MessageDTO } from "@/types";

export interface SearchResult {
  message: MessageDTO;
  chat: { id: string; name: string | null; type: "PRIVATE" | "GROUP" | "CHANNEL" | "SERVICE" | "SELF" };
  rank?: number;
}

export interface SearchMessagesOptions {
  userId: string;
  query: string;
  limit?: number;
  chatId?: string;
  fromUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function searchMessages({
  userId,
  query,
  limit = 50,
  chatId,
  fromUserId,
  dateFrom,
  dateTo,
}: SearchMessagesOptions): Promise<SearchResult[]> {
  const q = query.trim();

  // Получаем chatId, в которых участвует пользователь
  let chatIds: string[];
  if (chatId) {
    const membership = await prisma.participant.findFirst({
      where: { userId, chatId },
    });
    if (!membership) return [];
    chatIds = [chatId];
  } else {
    const memberships = await prisma.participant.findMany({
      where: { userId },
      select: { chatId: true },
    });
    if (memberships.length === 0) return [];
    chatIds = memberships.map((m) => m.chatId);
  }

  // Если есть текстовый запрос — используем PostgreSQL FTS
  if (q.length >= 2) {
    const tsQuery = q
      .replace(/[^\w\sа-яА-ЯёЁ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w}:*`)
      .join(" & ");

    if (!tsQuery) return [];

    const conditions: string[] = [
      `m."chatId" = ANY($1::text[])`,
      `m."isDeleted" = false`,
      `to_tsvector('russian', COALESCE(m."content", '')) @@ plainto_tsquery('russian', $2)`,
    ];
    const params: any[] = [chatIds, q];
    let paramIdx = 3;

    if (fromUserId) {
      conditions.push(`m."senderId" = $${paramIdx}`);
      params.push(fromUserId);
      paramIdx++;
    }
    if (dateFrom) {
      conditions.push(`m."createdAt" >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`m."createdAt" <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    const sql = `
      SELECT m.*, 
             ts_rank(to_tsvector('russian', COALESCE(m."content", '')), plainto_tsquery('russian', $2)) AS rank,
             u."id" AS sender_id, u."username" AS sender_username, u."displayName" AS sender_displayname, u."avatarUrl" AS sender_avatarurl,
             c."id" AS chat_id, c."name" AS chat_name, c."type" AS chat_type
      FROM "Message" m
      JOIN "User" u ON m."senderId" = u."id"
      JOIN "Chat" c ON m."chatId" = c."id"
      WHERE ${whereClause}
      ORDER BY rank DESC, m."createdAt" DESC
      LIMIT $${paramIdx}
    `;
    params.push(limit);

    const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params);

    if (rows.length === 0) return [];

    const messageIds = rows.map((r: any) => r.id);
    const reactionsMap = await getReactionsForMessages(messageIds);

    return rows.map((row: any) => ({
      message: toMessageDTO({
        id: row.id,
        chatId: row.chatId,
        senderId: row.senderId,
        type: row.type,
        content: row.content,
        mediaUrl: row.mediaUrl,
        thumbnailUrl: row.thumbnailUrl,
        fileName: row.fileName,
        fileSize: row.fileSize,
        replyToId: row.replyToId,
        isEdited: row.isEdited,
        createdAt: row.createdAt,
        sender: {
          id: row.sender_id,
          username: row.sender_username,
          displayName: row.sender_displayname,
          avatarUrl: row.sender_avatarurl,
        },
        reactions: (reactionsMap.get(row.id) ?? []).flatMap((r: any) =>
          r.userIds.map((uid: string) => ({ emoji: r.emoji, userId: uid })),
        ),
      }),
      chat: {
        id: row.chat_id,
        name: row.chat_name,
        type: row.chat_type,
      },
      rank: Number(row.rank),
    }));
  }

  // Fallback: фильтр без текста (по чату/дате/отправителю)
  const where: any = {
    chatId: { in: chatIds },
    isDeleted: false,
  };
  if (fromUserId) where.senderId = fromUserId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const rows = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      chat: { select: { id: true, name: true, type: true } },
    },
  });

  if (rows.length === 0) return [];

  const reactionsMap = await getReactionsForMessages(rows.map((r) => r.id));

  return rows.map((row) => ({
    message: toMessageDTO({
      ...row,
      reactions: (reactionsMap.get(row.id) ?? []).flatMap((r) =>
        r.userIds.map((uid) => ({ emoji: r.emoji, userId: uid })),
      ),
    }),
    chat: {
      id: row.chat.id,
      name: row.chat.name,
      type: row.chat.type,
    },
  }));
}
