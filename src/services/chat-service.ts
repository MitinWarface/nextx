/**
 * Бизнес-логика чатов. Изолирует БД от роутов.
 */
import type { ChatType, MessageType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api-helpers";
import { maskUserForViewer } from "./privacy-service";
import type { ChatPreview, MessageDTO, PublicUser } from "@/types";

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  lastSeenAt: true,
  premiumStatus: true,
  stealthMode: true,
  usernameHistory: true,
} as const;

const SENDER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  premiumStatus: true,
} as const;

export interface ListChatsOptions {
  userId: string;
  limit?: number;
  offset?: number;
}

export async function listChats({
  userId,
  limit = 50,
  offset = 0,
}: ListChatsOptions): Promise<ChatPreview[]> {
  const rows = await prisma.participant.findMany({
    where: { userId },
    take: limit,
    skip: offset,
    orderBy: { chat: { lastMessageAt: "desc" } },
    include: {
      chat: {
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            where: { isDeleted: false },
            include: { sender: { select: SENDER_SELECT } },
          },
          participants: {
            include: { user: { select: PUBLIC_USER_SELECT } },
          },
        },
      },
    },
  });

  return Promise.all(rows.map((r) => toChatPreview(r, userId)));
}

export async function getOrCreatePrivateChat({
  userId,
  otherUserId,
}: {
  userId: string;
  otherUserId: string;
}): Promise<ChatPreview> {
  if (userId === otherUserId) {
    throw new HttpError(400, "cannot_create_chat_with_self");
  }

  // Быстрый путь: уже есть связка
  const myPrivate = await prisma.participant.findMany({
    where: { userId, chat: { type: "PRIVATE" } },
    select: { chatId: true },
  });
  const shared = await prisma.participant.findFirst({
    where: {
      userId: otherUserId,
      chatId: { in: myPrivate.map((p) => p.chatId) },
    },
    select: { chatId: true },
  });

  if (shared) {
    return getChatPreview(shared.chatId, userId);
  }

  // Создаём
  const chat = await prisma.chat.create({
    data: {
      type: "PRIVATE",
      participants: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
    select: { id: true },
  });
  return getChatPreview(chat.id, userId);
}

export async function createGroupChat(input: {
  creatorId: string;
  name: string;
  memberIds: string[];
  type?: "GROUP" | "CHANNEL";
  description?: string;
  isPrivate?: boolean;
  maxSubscribers?: number;
}): Promise<ChatPreview> {
  const chatType = input.type ?? "GROUP";
  if (chatType === "GROUP" && input.memberIds.length < 2) {
    throw new HttpError(400, "group_requires_at_least_2_members");
  }
  const uniqueMembers = Array.from(new Set([input.creatorId, ...input.memberIds]));

  const chat = await prisma.chat.create({
    data: {
      type: chatType,
      name: input.name,
      creatorId: input.creatorId,
      description: input.description,
      isPrivate: input.isPrivate ?? false,
      maxSubscribers: input.maxSubscribers,
      participants: {
        create: uniqueMembers.map((userId, idx) => ({
          userId,
          role: idx === 0 ? ("OWNER" as const) : ("MEMBER" as const),
        })),
      },
    },
    select: { id: true },
  });
  return getChatPreview(chat.id, input.creatorId);
}

export async function getChatPreview(
  chatId: string,
  userId: string,
): Promise<ChatPreview> {
  const row = await prisma.participant.findUnique({
    where: { chatId_userId: { chatId, userId } },
    include: {
      chat: {
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            where: { isDeleted: false },
            include: { sender: { select: SENDER_SELECT } },
          },
          participants: {
            include: { user: { select: PUBLIC_USER_SELECT } },
          },
        },
      },
    },
  });

  if (!row) throw new HttpError(404, "chat_not_found");
  return toChatPreview(row, userId);
}

export async function ensureParticipant(
  chatId: string,
  userId: string,
): Promise<void> {
  const exists = await prisma.participant.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!exists) throw new HttpError(403, "not_a_participant");
}

// ============================================================
// Mappers
// ============================================================

type ChatRow = {
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  chat: {
    id: string;
    type: ChatType;
    name: string | null;
    avatarUrl: string | null;
    description: string | null;
    defaultTtlSeconds: number | null;
    chatPinHash: string | null;
    colorLabel: string | null;
    isContentProtected: boolean;
    lastMessageAt: Date;
    messages: Array<{
      id: string;
      chatId: string;
      senderId: string;
      type: MessageType;
      content: string | null;
      mediaUrl: string | null;
      replyToId: string | null;
      isEdited: boolean;
      createdAt: Date;
      sender: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
    }>;
    participants: Array<{
      role: "OWNER" | "ADMIN" | "MEMBER";
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        status: PublicUser["status"];
        lastSeenAt: Date;
      };
    }>;
  };
};

async function toChatPreview(row: ChatRow, myUserId?: string): Promise<ChatPreview> {
  const last = row.chat.messages[0] ?? null;
  // Saved Messages: имя служебное — показываем «Избранное»
  const displayName =
    row.chat.type === "PRIVATE" && row.chat.name?.startsWith("saved:")
      ? "Избранное"
      : row.chat.name;
  const myParticipant = myUserId
    ? row.chat.participants.find((p) => p.user.id === myUserId)
    : undefined;
  return {
    id: row.chat.id,
    type: row.chat.type,
    name: displayName,
    avatarUrl: row.chat.avatarUrl,
    description: row.chat.description,
    lastMessageAt: row.chat.lastMessageAt.toISOString(),
    unreadCount: row.unreadCount,
    isPinned: row.isPinned,
    isMuted: row.isMuted,
    isArchived: (row as any).isArchived ?? false,
    myRole: myParticipant?.role,
    defaultTtlSeconds: row.chat.defaultTtlSeconds,
    chatPinHash: (row.chat as any).chatPinHash ?? null,
    colorLabel: (row.chat as any).colorLabel ?? null,
    isContentProtected: row.chat.isContentProtected ?? false,
    lastMessage: last
      ? {
          id: last.id,
          chatId: last.chatId,
          senderId: last.senderId,
          type: last.type,
          content: last.content,
          mediaUrl: last.mediaUrl,
          replyToId: last.replyToId,
          isEdited: last.isEdited,
          createdAt: last.createdAt.toISOString(),
          sender: last.sender ?? undefined,
          status: "delivered",
        }
      : null,
    participants: await Promise.all(
      row.chat.participants.map(async (p) => {
        const masked = await maskUserForViewer(p.user, myUserId ?? p.user.id);
        return {
          id: p.user.id,
          username: p.user.username,
          displayName: p.user.displayName,
          avatarUrl: masked.avatarUrl,
          status: masked.status as PublicUser["status"],
          lastSeenAt: masked.lastSeenAt.toISOString(),
          premiumStatus: (p.user as any).premiumStatus ?? undefined,
          stealthMode: (p.user as any).stealthMode ?? false,
        };
      }),
    ),
  };
}

export function toMessageDTO(
  msg: {
    id: string;
    chatId: string;
    senderId: string;
    type: MessageType;
    content: string | null;
    mediaUrl: string | null;
    thumbnailUrl?: string | null;
    hlsUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    replyToId: string | null;
    forwardedFromId?: string | null;
    isEdited: boolean;
    editedAt?: Date | null;
    isPinned?: boolean;
    pinnedAt?: Date | null;
    pinnedBy?: {
      id: string;
      displayName: string;
    } | null;
    createdAt: Date;
    sender?: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
    reactions?: { emoji: string; userId: string }[];
    replyTo?: {
      id: string;
      senderId: string;
      type: MessageType;
      content: string | null;
      mediaUrl: string | null;
      fileName?: string | null;
      sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
    } | null;
    forwardedFrom?: {
      id: string;
      senderId: string;
      chatId: string;
      chatName: string | null;
      senderName: string;
      createdAt: Date;
    } | null;
    mentions?: string[];
    linkTitle?: string | null;
    linkDescription?: string | null;
    linkImage?: string | null;
    linkSiteName?: string | null;
    linkUrl?: string | null;
    keyboard?:
      | Prisma.JsonValue
      | Array<Array<{ text: string; url?: string; callback_data?: string }>>
      | null;
    expiresAt?: Date | null;
    poll?: {
      id: string;
      question: string;
      multiChoice: boolean;
      isClosed: boolean;
      closesAt: Date | null;
      options: Array<{
        id: string;
        text: string;
        order: number;
        _count?: { votes: number };
      }>;
    } | null;
    taskItems?: Array<{ id: string; text: string; done: boolean; sortOrder: number }> | null;
    isSilent?: boolean;
    isStealth?: boolean;
    isAnonymousForward?: boolean;
    isProtected?: boolean;
    viewCount?: number;
    forwardCount?: number;
    copyCount?: number;
  },
): MessageDTO {
  // Агрегируем реакции по emoji
  const map = new Map<string, { emoji: string; count: number; userIds: string[] }>();
  for (const r of msg.reactions ?? []) {
    const cur = map.get(r.emoji);
    if (cur) {
      cur.count += 1;
      cur.userIds.push(r.userId);
    } else {
      map.set(r.emoji, { emoji: r.emoji, count: 1, userIds: [r.userId] });
    }
  }
  return {
    id: msg.id,
    chatId: msg.chatId,
    senderId: msg.senderId,
    type: msg.type,
    content: msg.content,
    mediaUrl: msg.mediaUrl,
    thumbnailUrl: msg.thumbnailUrl ?? null,
    hlsUrl: msg.hlsUrl ?? null,
    fileName: msg.fileName ?? null,
    fileSize: msg.fileSize ?? null,
    replyToId: msg.replyToId,
    replyTo: msg.replyTo
      ? {
          id: msg.replyTo.id,
          senderId: msg.replyTo.senderId,
          type: msg.replyTo.type,
          content: msg.replyTo.content,
          mediaUrl: msg.replyTo.mediaUrl,
          fileName: msg.replyTo.fileName ?? null,
          sender: msg.replyTo.sender,
        }
      : null,
    forwardedFromId: msg.forwardedFromId ?? null,
    forwardedFrom: msg.forwardedFrom
      ? {
          id: msg.forwardedFrom.id,
          senderId: msg.forwardedFrom.senderId,
          chatId: msg.forwardedFrom.chatId,
          chatName: msg.forwardedFrom.chatName,
          senderName: msg.forwardedFrom.senderName,
          createdAt: msg.forwardedFrom.createdAt.toISOString(),
        }
      : null,
    isEdited: msg.isEdited,
    editedAt: msg.editedAt ? msg.editedAt.toISOString() : null,
    isPinned: msg.isPinned ?? false,
    pinnedAt: msg.pinnedAt ? msg.pinnedAt.toISOString() : null,
    pinnedBy: msg.pinnedBy
      ? { id: msg.pinnedBy.id, displayName: msg.pinnedBy.displayName }
      : null,
    createdAt: msg.createdAt.toISOString(),
    sender: msg.sender ?? undefined,
    reactions: Array.from(map.values()),
    mentions: msg.mentions ?? [],
    linkTitle: msg.linkTitle ?? null,
    linkDescription: msg.linkDescription ?? null,
    linkImage: msg.linkImage ?? null,
    linkSiteName: msg.linkSiteName ?? null,
    linkUrl: msg.linkUrl ?? null,
    keyboard: (msg.keyboard ?? null) as MessageDTO["keyboard"],
    expiresAt: msg.expiresAt ? msg.expiresAt.toISOString() : null,
    poll: msg.poll
      ? {
          id: msg.poll.id,
          question: msg.poll.question,
          multiChoice: msg.poll.multiChoice,
          isClosed: msg.poll.isClosed,
          closesAt: msg.poll.closesAt ? msg.poll.closesAt.toISOString() : null,
          options: msg.poll.options.map((o) => ({
            id: o.id,
            text: o.text,
            order: o.order,
            votes: o._count?.votes ?? 0,
            count: o._count?.votes ?? 0,
            userIds: (o as any).votes?.map((v: any) => v.userId) ?? [],
          })),
        }
      : null,
    taskItems: msg.taskItems?.map((t) => ({ id: t.id, text: t.text, done: t.done, sortOrder: t.sortOrder })) ?? null,
    isSilent: msg.isSilent ?? false,
    isStealth: msg.isStealth ?? false,
    isAnonymousForward: msg.isAnonymousForward ?? false,
    isProtected: msg.isProtected ?? false,
    viewCount: msg.viewCount ?? 0,
    forwardCount: msg.forwardCount ?? 0,
    copyCount: msg.copyCount ?? 0,
  };
}
