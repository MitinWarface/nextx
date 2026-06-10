/**
 * Бизнес-логика сообщений.
 * Write-through в Redis, источник истины — PostgreSQL.
 */
import type { MessageType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishNewMessage, cacheMessage } from "@/lib/redis";
import { HttpError } from "@/lib/api-helpers";
import { ensureParticipant, toMessageDTO } from "./chat-service";
import { getReactionsForMessages } from "./reaction-service";
import { getLevelForXP, getXPThreshold, getXPForMessage } from "@/lib/community-levels";
import { moderateContent } from "@/lib/ai-moderation";
import type { MessageDTO } from "@/types";

export interface ListMessagesOptions {
  chatId: string;
  userId: string;
  cursor?: string; // ISO date
  limit?: number;
}

export async function listMessages({
  chatId,
  userId,
  cursor,
  limit = 50,
}: ListMessagesOptions): Promise<{ messages: MessageDTO[]; nextCursor: string | null }> {
  await ensureParticipant(chatId, userId);

  // Получаем список ID заблокированных пользователей (только в DM)
  const blockedIds = await prisma.contact.findMany({
    where: { ownerId: userId, isBlocked: true },
    select: { targetId: true },
  });
  const blockedSet = new Set(blockedIds.map((b) => b.targetId));

  // Check if user is channel owner/admin to see scheduled messages
  const chatInfo = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      type: true,
      participants: {
        where: { userId },
        select: { role: true },
      },
    },
  });
  const isChannelAdmin = chatInfo?.type === "CHANNEL" &&
    chatInfo.participants.some((p) => p.role === "OWNER" || p.role === "ADMIN");

  // Используем cursor-пагинацию по createdAt desc
  const rows = await prisma.message.findMany({
    where: {
      chatId,
      isDeleted: false,
      NOT: [{ deletedByUserIds: { has: userId } }],
      // Скрываем просроченные (auto-delete) и shadow-ban visibility
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        {
          OR: [
            { visibleToUserIds: { isEmpty: true } },
            { visibleToUserIds: { has: userId } },
          ],
        },
        // Filter out scheduled messages (publishAt in future) for non-owners
        ...(isChannelAdmin
          ? []
          : [
              {
                OR: [
                  { publishAt: null },
                  { publishAt: { lte: new Date() } },
                ],
              },
            ]),
      ],
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, premiumStatus: true } },
      pinnedBy: { select: { id: true, displayName: true } },
      poll: {
        include: {
          options: {
            orderBy: { order: "asc" },
            include: { votes: { select: { userId: true } } },
          },
        },
      },
      taskItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Батч-запрос реакций
  const reactionsMap = await getReactionsForMessages(
    rows.map((r) => r.id),
  );

  // Батч-запрос родительских сообщений для reply-цепочек
  const replyToIds = Array.from(
    new Set(rows.map((r) => r.replyToId).filter((id): id is string => Boolean(id))),
  );
  const replyToMap = new Map<
    string,
    {
      id: string;
      senderId: string;
      type: MessageType;
      content: string | null;
      mediaUrl: string | null;
      fileName: string | null;
      sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
    }
  >();
  if (replyToIds.length > 0) {
    const parents = await prisma.message.findMany({
      where: { id: { in: replyToIds }, isDeleted: false },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, premiumStatus: true } },
      },
    });
    for (const p of parents) {
      if (!p.sender) continue;
      replyToMap.set(p.id, {
        id: p.id,
        senderId: p.senderId,
        type: p.type,
        content: p.content,
        mediaUrl: p.mediaUrl,
        fileName: p.fileName,
        sender: p.sender,
      });
    }
  }

  // Батч-запрос источников пересылок
  const forwardedIds = Array.from(
    new Set(
      rows.map((r) => r.forwardedFromId).filter((id): id is string => Boolean(id)),
    ),
  );
  const forwardedMap = new Map<
    string,
    {
      id: string;
      senderId: string;
      chatId: string;
      chatName: string | null;
      senderName: string;
      createdAt: Date;
    }
  >();
  if (forwardedIds.length > 0) {
    const originals = await prisma.message.findMany({
      where: { id: { in: forwardedIds } },
      include: {
        sender: { select: { id: true, displayName: true } },
        chat: { select: { id: true, name: true, type: true } },
      },
    });
    for (const o of originals) {
      if (!o.sender) continue;
      forwardedMap.set(o.id, {
        id: o.id,
        senderId: o.senderId,
        chatId: o.chatId,
        chatName: o.chat?.name ?? null,
        senderName: o.sender.displayName,
        createdAt: o.createdAt,
      });
    }
  }

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? slice[slice.length - 1].createdAt.toISOString() : null;

  // Фильтруем сообщения от заблокированных пользователей
  const filtered = slice.filter((r) => !blockedSet.has(r.senderId));

  // Возвращаем в возрастающем порядке (старые → новые)
  const result = {
    messages: filtered
      .reverse()
      .map((row) =>
        toMessageDTO({
          ...row,
          reactions: (reactionsMap.get(row.id) ?? []).flatMap((r) =>
            r.userIds.map((uid) => ({ emoji: r.emoji, userId: uid })),
          ),
          replyTo: row.replyToId ? replyToMap.get(row.replyToId) ?? null : null,
          forwardedFrom: row.forwardedFromId
            ? forwardedMap.get(row.forwardedFromId) ?? null
            : null,
        }),
      ),
    nextCursor,
  };

  // Increment viewCount for displayed messages (fire-and-forget)
  if (result.messages.length > 0) {
    const ids = result.messages.map((m) => m.id);
    prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});
  }

  return result;
}

export interface SendMessageInput {
  chatId: string;
  senderId: string;
  type: MessageType;
  content?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  replyToId?: string | null;
  forwardedFromId?: string | null;
  mentions?: string[];
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  linkSiteName?: string;
  linkUrl?: string;
  keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
  poll?: { question: string; options: string[]; multiChoice?: boolean };
  expiresAt?: Date | null;
  scheduledFor?: Date;
  shadowBanned?: boolean;
  isSilent?: boolean;
  isStealth?: boolean;
  isAnonymousForward?: boolean;
  isViewOnce?: boolean;
}

// ── Real-time anti-spam ──
const SPAM_WINDOW_MS = 60_000;
const SPAM_LIMIT_MSG = 100;
const SPAM_LIMIT_LINKS = 5;
const SPAM_LIMIT_COMPLAINTS = 10;
const spamCache = new Map<string, { count: number; linkCount: number; resetAt: number }>();

async function checkAntiSpam(userId: string): Promise<{ blocked: boolean; reason?: string }> {
  const now = Date.now();
  const entry = spamCache.get(userId);
  if (entry && entry.resetAt > now) {
    entry.count++;
    const hasLink = false; // checked separately below
    if (entry.count > SPAM_LIMIT_MSG) return { blocked: true, reason: "rate_limit_flood" };
  } else {
    spamCache.set(userId, { count: 1, linkCount: 0, resetAt: now + SPAM_WINDOW_MS });
  }

  const complaints = await prisma.report.count({
    where: { targetUserId: userId, status: { not: "DISMISSED" } },
  });
  if (complaints >= SPAM_LIMIT_COMPLAINTS) {
    return { blocked: true, reason: "too_many_complaints" };
  }
  return { blocked: false };
}

async function trackLinkSpam(userId: string, hasLink: boolean): Promise<{ blocked: boolean; reason?: string }> {
  if (!hasLink) return { blocked: false };
  const now = Date.now();
  const entry = spamCache.get(userId);
  if (entry) {
    entry.linkCount++;
    if (entry.linkCount > SPAM_LIMIT_LINKS) return { blocked: true, reason: "mass_links" };
  }
  return { blocked: false };
}

export async function sendMessage(input: SendMessageInput): Promise<MessageDTO> {
  await ensureParticipant(input.chatId, input.senderId);

  // ── Check if sender is shadow-banned ──
  const sender = await prisma.user.findUnique({
    where: { id: input.senderId },
    select: { isShadowBanned: true },
  });
  if (sender?.isShadowBanned) {
    input = { ...input, shadowBanned: true };
  }

  // ── Real-time anti-spam checks ──
  const spamResult = await checkAntiSpam(input.senderId);
  if (spamResult.blocked) {
    throw new HttpError(429, spamResult.reason ?? "spam_detected");
  }
  if (input.content && /https?:\/\//i.test(input.content)) {
    const linkSpam = await trackLinkSpam(input.senderId, true);
    if (linkSpam.blocked) {
      throw new HttpError(429, linkSpam.reason ?? "spam_detected");
    }
  }

  // Проверка: если собеседник в DM заблокировал нас — не даём отправлять
  const chat = await prisma.chat.findUnique({
    where: { id: input.chatId },
    select: {
      type: true,
      participants: {
        select: { userId: true, role: true },
      },
    },
  });
  if (chat?.type === "PRIVATE") {
    const otherIds = chat.participants
      .map((p) => p.userId)
      .filter((uid) => uid !== input.senderId);
    if (otherIds.length > 0) {
      const blockedByThem = await prisma.contact.findFirst({
        where: { ownerId: otherIds[0], targetId: input.senderId, isBlocked: true },
        select: { id: true },
      });
      if (blockedByThem) {
        throw new HttpError(403, "you_are_blocked");
      }
    }
  }
  if (chat?.type === "CHANNEL") {
    const me = chat.participants.find((p) => p.userId === input.senderId);
    if (!me || (me.role !== "OWNER" && me.role !== "ADMIN")) {
      throw new HttpError(403, "channel_posting_for_admins_only");
    }
  }

  // Авто-удаление: применим chat.defaultTtlSeconds, если нет явного ttlSeconds
  if (input.expiresAt == null) {
    const ttlRow = await prisma.chat.findUnique({
      where: { id: input.chatId },
      select: { defaultTtlSeconds: true },
    });
    if (ttlRow?.defaultTtlSeconds) {
      input = {
        ...input,
        expiresAt: new Date(Date.now() + ttlRow.defaultTtlSeconds * 1000),
      };
    }
  }

  // ── AI Content Moderation (non-blocking, fire-and-forget) ──
  if (input.type === "TEXT" && input.content && input.content.length > 5) {
    moderateContent(input.content)
      .then(async (modResult) => {
        if (!modResult.flagged) return;
        const { logModerationEvent } = await import("@/lib/ai-moderation");
        if (modResult.score > 0.95) {
          await logModerationEvent({
            userId: input.senderId,
            type: "ai_auto_delete",
            score: modResult.score,
            reason: `Flagged: ${modResult.categories.join(", ")}`,
            messageId: undefined,
            chatId: input.chatId,
            autoAction: "auto_delete",
          });
          // Auto-delete: soft delete the specific flagged message only
          prisma.message.update({
            where: { id: created.id },
            data: { isDeleted: true, deletedAt: new Date(), content: null },
          }).catch(() => {});
        } else if (modResult.score > 0.8) {
          await logModerationEvent({
            userId: input.senderId,
            type: "ai_toxicity",
            score: modResult.score,
            reason: `Flagged: ${modResult.categories.join(", ")}`,
            chatId: input.chatId,
          });
          // Increase moderation score, shadow-ban at threshold
          const user = await prisma.user.findUnique({
            where: { id: input.senderId },
            select: { moderationScore: true, isShadowBanned: true },
          });
          if (user) {
            const newScore = user.moderationScore + Math.round(modResult.score * 10);
            const updateData: Record<string, unknown> = { moderationScore: newScore };
            if (newScore >= 100 && !user.isShadowBanned) {
              updateData.isShadowBanned = true;
              updateData.shadowBannedBy = "system";
            }
            await prisma.user.update({ where: { id: input.senderId }, data: updateData });
          }
        } else {
          await logModerationEvent({
            userId: input.senderId,
            type: "ai_low",
            score: modResult.score,
            reason: `Low risk: ${modResult.categories.join(", ")}`,
            chatId: input.chatId,
          });
        }
      })
      .catch(() => {});
  }

  if (input.type === "TEXT" && !input.content?.trim()) {
    throw new HttpError(400, "empty_text_message");
  }
  if (input.type !== "TEXT" && !input.mediaUrl) {
    throw new HttpError(400, "media_required_for_non_text");
  }

  // Авто-детект первой ссылки в тексте для link-preview
  if (input.content && !input.linkUrl) {
    const detected = detectFirstUrl(input.content);
    if (detected) {
      input = {
        ...input,
        linkUrl: detected.url,
        linkSiteName: detected.siteName,
      };
    }
  }

  // Если это reply — проверим, что replyTo в этом же чате
  if (input.replyToId) {
    const reply = await prisma.message.findUnique({
      where: { id: input.replyToId },
      select: { chatId: true },
    });
    if (!reply || reply.chatId !== input.chatId) {
      throw new HttpError(400, "invalid_reply_target");
    }
  }

  // Если это forward — загрузим оригинал для подписи UI
  let forwardedFrom: Parameters<typeof toMessageDTO>[0]["forwardedFrom"] = null;
  if (input.forwardedFromId) {
    const original = await prisma.message.findUnique({
      where: { id: input.forwardedFromId },
      include: {
        sender: { select: { id: true, displayName: true } },
        chat: { select: { id: true, name: true, type: true } },
      },
    });
    if (!original || !original.sender) {
      throw new HttpError(400, "invalid_forward_target");
    }
    if (original.isDeleted) {
      throw new HttpError(410, "forward_source_deleted");
    }
    forwardedFrom = {
      id: original.id,
      senderId: original.senderId,
      chatId: original.chatId,
      chatName: original.chat?.name ?? null,
      senderName: original.sender.displayName,
      createdAt: original.createdAt,
    };
    // Increment forwardCount on the original message (fire-and-forget)
    prisma.message.update({
      where: { id: input.forwardedFromId! },
      data: { forwardCount: { increment: 1 } },
    }).catch(() => {});
  }

  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        chatId: input.chatId,
        senderId: input.senderId,
        type: input.type,
        content: input.content ?? null,
        mediaUrl: input.mediaUrl ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        fileName: input.fileName ?? null,
        fileSize: input.fileSize ?? null,
        replyToId: input.replyToId ?? null,
        forwardedFromId: input.forwardedFromId ?? null,
        mentions: input.mentions ?? [],
        linkTitle: input.linkTitle,
        linkDescription: input.linkDescription,
        linkImage: input.linkImage,
        linkSiteName: input.linkSiteName,
        linkUrl: input.linkUrl,
        keyboard: input.keyboard as unknown as Prisma.InputJsonValue | undefined,
        expiresAt: input.expiresAt,
        scheduledFor: input.scheduledFor ?? null,
        isScheduled: !!input.scheduledFor,
        isSilent: input.isSilent ?? false,
        isStealth: input.isStealth ?? false,
        isAnonymousForward: input.isAnonymousForward ?? false,
        isViewOnce: input.isViewOnce ?? false,
        visibleToUserIds: input.shadowBanned ? [input.senderId] : [],
        poll: input.poll
          ? {
              create: {
                question: input.poll.question,
                multiChoice: input.poll.multiChoice ?? false,
                options: {
                  create: input.poll.options.map((text, idx) => ({
                    text,
                    order: idx,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, premiumStatus: true } },
        pinnedBy: { select: { id: true, displayName: true } },
        poll: { include: { options: { orderBy: { order: "asc" } } } },
      },
    });

    // Инкремент unread для всех участников кроме отправителя
    await tx.participant.updateMany({
      where: { chatId: input.chatId, userId: { not: input.senderId } },
      data: { unreadCount: { increment: 1 } },
    });

    // Обновляем lastMessageAt чата
    await tx.chat.update({
      where: { id: input.chatId },
      data: { lastMessageAt: message.createdAt },
    });

    return message;
  });

  // ── Community Level XP: increment chat XP for group/channel messages ──
  if (chat?.type === "GROUP" || chat?.type === "CHANNEL") {
    const xpGain = getXPForMessage();
    try {
      const chatRow = await prisma.chat.findUnique({
        where: { id: input.chatId },
        select: { experience: true, level: true },
      });
      if (chatRow) {
        const newXP = chatRow.experience + xpGain;
        const newLevel = getLevelForXP(newXP);
        const updatedFields: Record<string, unknown> = { experience: newXP };
        if (newLevel !== chatRow.level) {
          updatedFields.level = newLevel;
        }
        await prisma.chat.update({
          where: { id: input.chatId },
          data: updatedFields,
        });
      }
    } catch {
      // Non-critical: don't fail the message if XP update fails
    }
  }

  // Если это reply — подгружаем родительское сообщение для UI
  let replyTo: Parameters<typeof toMessageDTO>[0]["replyTo"] = null;
  if (created.replyToId) {
    const parent = await prisma.message.findUnique({
      where: { id: created.replyToId },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, premiumStatus: true } },
      },
    });
    if (parent && parent.sender) {
      replyTo = {
        id: parent.id,
        senderId: parent.senderId,
        type: parent.type,
        content: parent.content,
        mediaUrl: parent.mediaUrl,
        fileName: parent.fileName,
        sender: parent.sender,
      };
    }
  }

  const dto = toMessageDTO({ ...created, replyTo, forwardedFrom });

  // Уведомления для упомянутых пользователей
  if (input.mentions && input.mentions.length > 0) {
    const sender = created.sender;
    const preview = (input.content ?? "").slice(0, 200);
    const title = sender?.displayName ?? "Упоминание";
    await prisma.notification.createMany({
      data: input.mentions
        .filter((uid) => uid !== input.senderId)
        .map((uid) => ({
          userId: uid,
          type: "MENTION" as const,
          title,
          body: preview,
          payload: { chatId: input.chatId, messageId: created.id },
        })),
    });
  }

  // Write-through в Redis + pub/sub для Socket.io
  // Skip pub/sub for scheduled messages — scheduler will emit when due
  if (!input.scheduledFor || new Date(input.scheduledFor) <= new Date()) {
    await Promise.all([
      cacheMessage(input.chatId, dtoToCached(dto)),
      publishNewMessage(input.chatId, dto),
    ]);
  } else {
    // Scheduled: only cache, pub/sub will happen from scheduler
    await cacheMessage(input.chatId, dtoToCached(dto));
  }

  return dto;
}

export async function editMessage(input: {
  messageId: string;
  userId: string;
  content: string;
}): Promise<MessageDTO> {
  const message = await prisma.message.findUnique({
    where: { id: input.messageId },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, premiumStatus: true } },
      pinnedBy: { select: { id: true, displayName: true } },
    },
  });
  if (!message) throw new HttpError(404, "message_not_found");
  if (message.isDeleted) throw new HttpError(410, "message_deleted");
  if (message.senderId !== input.userId) throw new HttpError(403, "not_message_owner");
  if (message.type !== "TEXT") throw new HttpError(400, "non_text_not_editable");

  const oldContent = message.content ?? "";

  const [updated] = await prisma.$transaction([
    prisma.message.update({
      where: { id: input.messageId },
      data: { content: input.content, isEdited: true, editedAt: new Date() },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, premiumStatus: true } },
        pinnedBy: { select: { id: true, displayName: true } },
      },
    }),
    prisma.messageEdit.create({
      data: {
        messageId: input.messageId,
        oldContent,
        newContent: input.content,
        editedBy: input.userId,
      },
    }),
  ]);
  const dto = toMessageDTO(updated);

  await publishNewMessage(updated.chatId, { ...dto, _event: "edited" } as MessageDTO & { _event: string });
  return dto;
}

export async function togglePinMessage(input: {
  messageId: string;
  userId: string;
  pin: boolean;
}): Promise<MessageDTO> {
  const message = await prisma.message.findUnique({
    where: { id: input.messageId },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, premiumStatus: true } },
      pinnedBy: { select: { id: true, displayName: true } },
    },
  });
  if (!message) throw new HttpError(404, "message_not_found");
  if (message.isDeleted) throw new HttpError(410, "message_deleted");
  await ensureParticipant(message.chatId, input.userId);

  const updated = await prisma.message.update({
    where: { id: input.messageId },
    data: {
      isPinned: input.pin,
      pinnedAt: input.pin ? new Date() : null,
      pinnedById: input.pin ? input.userId : null,
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, premiumStatus: true } },
      pinnedBy: { select: { id: true, displayName: true } },
    },
  });
  const dto = toMessageDTO(updated);

  await publishNewMessage(updated.chatId, {
    _event: "pin",
    chatId: updated.chatId,
    messageId: updated.id,
    isPinned: updated.isPinned,
    pinnedAt: updated.pinnedAt ? updated.pinnedAt.toISOString() : null,
    pinnedById: updated.pinnedById,
    message: dto,
  } as unknown as MessageDTO);
  return dto;
}

export async function deleteMessage(input: {
  messageId: string;
  userId: string;
}): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: input.messageId },
    select: { senderId: true, chatId: true, mediaUrl: true, thumbnailUrl: true },
  });
  if (!message) throw new HttpError(404, "message_not_found");

  // Allow if owner, or if user is admin/owner of the chat
  if (message.senderId !== input.userId) {
    // Check if user has admin/owner role in the chat
    const participant = await prisma.participant.findFirst({
      where: { chatId: message.chatId, userId: input.userId },
      select: { role: true },
    });
    if (!participant || (participant.role !== "ADMIN" && participant.role !== "OWNER")) {
      throw new HttpError(403, "not_message_owner");
    }
  }

  // Delete attached files from storage
  if (message.mediaUrl) {
    try {
      const { deleteFile } = await import("@/lib/s3");
      // Extract key from URL: "/uploads/2026-06/abc.jpg" → "uploads/2026-06/abc.jpg" or S3 key
      const key = message.mediaUrl.startsWith("/uploads/")
        ? message.mediaUrl.slice(1)
        : message.mediaUrl;
      await deleteFile(key);
    } catch {}
  }
  if (message.thumbnailUrl) {
    try {
      const { deleteFile } = await import("@/lib/s3");
      const key = message.thumbnailUrl.startsWith("/uploads/")
        ? message.thumbnailUrl.slice(1)
        : message.thumbnailUrl;
      await deleteFile(key);
    } catch {}
  }

  await prisma.message.update({
    where: { id: input.messageId },
    data: { isDeleted: true, deletedAt: new Date(), content: null, mediaUrl: null, thumbnailUrl: null },
  });

  // Уведомляем подписчиков чата
  const { publishNewMessage } = await import("@/lib/redis");
  await publishNewMessage(message.chatId, {
    _event: "deleted",
    chatId: message.chatId,
    messageId: input.messageId,
  } as unknown as MessageDTO);
}

export async function incrementViewCount(messageId: string): Promise<void> {
  await prisma.message.update({
    where: { id: messageId },
    data: { viewCount: { increment: 1 } },
  });
}

export async function incrementForwardCount(messageId: string): Promise<void> {
  await prisma.message.update({
    where: { id: messageId },
    data: { forwardCount: { increment: 1 } },
  });
}

export async function incrementCopyCount(messageId: string): Promise<void> {
  await prisma.message.update({
    where: { id: messageId },
    data: { copyCount: { increment: 1 } },
  });
}

export async function markAsRead(input: {
  chatId: string;
  userId: string;
  messageId?: string;
}): Promise<{ readUpTo: string }> {
  await ensureParticipant(input.chatId, input.userId);

  // Находим ID последнего сообщения в чате
  const lastMessage = await prisma.message.findFirst({
    where: { chatId: input.chatId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!lastMessage) return { readUpTo: "" };

  await prisma.$transaction([
    prisma.participant.update({
      where: { chatId_userId: { chatId: input.chatId, userId: input.userId } },
      data: { unreadCount: 0, lastReadMessageId: lastMessage.id },
    }),
    prisma.messageRead.upsert({
      where: { messageId_userId: { messageId: lastMessage.id, userId: input.userId } },
      create: { messageId: lastMessage.id, userId: input.userId },
      update: { readAt: new Date() },
    }),
  ]);

  // Публикуем событие прочтения
  const { publishNewMessage } = await import("@/lib/redis");
  await publishNewMessage(input.chatId, {
    _event: "read",
    chatId: input.chatId,
    userId: input.userId,
    messageId: lastMessage.id,
  } as unknown as MessageDTO);

  return { readUpTo: lastMessage.id };
}

// ============================================================
// Helpers
// ============================================================

const URL_RE = /\bhttps?:\/\/[^\s<>"]+[^\s<>".,;:!?)]/gi;

function detectFirstUrl(
  text: string,
): { url: string; siteName: string } | null {
  const matches = text.match(URL_RE);
  if (!matches || matches.length === 0) return null;
  const raw = matches[0];
  let host = "";
  try {
    host = new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (!host) return null;
  return { url: raw, siteName: host };
}

function dtoToCached(dto: MessageDTO) {
  return {
    id: dto.id,
    chatId: dto.chatId,
    senderId: dto.senderId,
    type: dto.type,
    content: dto.content,
    mediaUrl: dto.mediaUrl,
    thumbnailUrl: dto.thumbnailUrl,
    hlsUrl: dto.hlsUrl ?? null,
    fileName: dto.fileName,
    fileSize: dto.fileSize,
    replyToId: dto.replyToId,
    forwardedFromId: dto.forwardedFromId ?? null,
    createdAt: new Date(dto.createdAt).getTime(),
    sender: dto.sender ?? undefined,
  };
}
