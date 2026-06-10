/**
 * Service & Self chat system — Telegram-style.
 *
 * SERVICE_CHAT: system notifications, security alerts, updates.
 * SELF_CHAT: saved messages / favorites (user chats with themselves).
 */
import { prisma } from "@/lib/prisma";

/**
 * Ensure user has both SERVICE and SELF chats. Called on registration or login.
 */
export async function ensureSpecialChats(userId: string) {
  // Service chat: one per user, type=SERVICE
  let serviceChat = await prisma.chat.findFirst({
    where: { type: "SERVICE", participants: { some: { userId } } },
  });
  if (!serviceChat) {
    serviceChat = await prisma.chat.create({
      data: {
        type: "SERVICE",
        name: "Messenger",
        participants: { create: { userId, role: "MEMBER" } },
      },
    });
  }

  // Self chat: one per user, type=SELF
  let selfChat = await prisma.chat.findFirst({
    where: { type: "SELF", participants: { some: { userId } } },
  });
  if (!selfChat) {
    selfChat = await prisma.chat.create({
      data: {
        type: "SELF",
        name: "Избранное",
        participants: { create: { userId, role: "OWNER" } },
      },
    });
  }

  // Personal channel: one per user, type=CHANNEL
  let personalChannel = await prisma.chat.findFirst({
    where: {
      type: "CHANNEL",
      creatorId: userId,
      name: { startsWith: "📢 " },
      participants: { some: { userId } },
    },
  });
  if (!personalChannel) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    personalChannel = await prisma.chat.create({
      data: {
        type: "CHANNEL",
        name: `📢 ${user?.username ?? "user"}`,
        creatorId: userId,
        participants: { create: { userId, role: "OWNER" } },
      },
    });
  }

  // Create default folders for new users
  await ensureDefaultFolders(userId).catch(console.error);

  return { serviceChatId: serviceChat.id, selfChatId: selfChat.id, personalChannelId: personalChannel.id };
}

/**
 * Create default chat folders for a new user.
 * Called once on first registration.
 */
export async function ensureDefaultFolders(userId: string) {
  const existing = await prisma.chatFolder.count({ where: { userId } });
  if (existing > 0) return; // already has folders

  const defaults = [
    { name: "Личные", icon: "User", sortOrder: 0 },
    { name: "Группы", icon: "Users", sortOrder: 1 },
    { name: "Каналы", icon: "Radio", sortOrder: 2 },
    { name: "Боты", icon: "Bot", sortOrder: 3 },
    { name: "Непрочитанные", icon: "Mail", sortOrder: 4 },
  ];

  for (const f of defaults) {
    await prisma.chatFolder.create({
      data: { userId, name: f.name, icon: f.icon, sortOrder: f.sortOrder },
    }).catch(() => {}); // ignore duplicates
  }
}

/**
 * Get or create the service chat for a user.
 */
export async function getServiceChat(userId: string) {
  const chat = await prisma.chat.findFirst({
    where: { type: "SERVICE", participants: { some: { userId } } },
  });
  if (chat) return chat;
  const result = await ensureSpecialChats(userId);
  return prisma.chat.findUnique({ where: { id: result.serviceChatId } });
}

/**
 * Get or create the self (saved messages) chat for a user.
 */
export async function getSelfChat(userId: string) {
  const chat = await prisma.chat.findFirst({
    where: { type: "SELF", participants: { some: { userId } } },
  });
  if (chat) return chat;
  const result = await ensureSpecialChats(userId);
  return prisma.chat.findUnique({ where: { id: result.selfChatId } });
}

/**
 * Send a service notification to a user's service chat.
 * serviceType: SECURITY | UPDATE | NEWS | SYSTEM | SUPPORT
 */
export async function sendServiceMessage(params: {
  userId: string;
  serviceType: string;
  content: string;
}) {
  const chat = await getServiceChat(params.userId);
  if (!chat) throw new Error("service_chat_not_found");

  // Use a system bot user or a special senderId
  const systemUser = await prisma.user.findFirst({
    where: { username: "system" },
  });
  const senderId = systemUser?.id ?? params.userId;

  const message = await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId,
      type: "SYSTEM",
      serviceType: params.serviceType,
      content: params.content,
    },
    include: {
      sender: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  // Update chat lastMessageAt
  await prisma.chat.update({
    where: { id: chat.id },
    data: { lastMessageAt: new Date() },
  });

  return message;
}

/**
 * Send a message to a user's self (saved messages) chat.
 */
export async function sendToSelfChat(params: {
  userId: string;
  content?: string;
  type?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  forwardedFromId?: string;
}) {
  const chat = await getSelfChat(params.userId);
  if (!chat) throw new Error("self_chat_not_found");

  const message = await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId: params.userId,
      type: (params.type as any) ?? "TEXT",
      content: params.content ?? null,
      mediaUrl: params.mediaUrl ?? null,
      fileName: params.fileName ?? null,
      fileSize: params.fileSize ?? null,
      forwardedFromId: params.forwardedFromId ?? null,
    },
    include: {
      sender: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  await prisma.chat.update({
    where: { id: chat.id },
    data: { lastMessageAt: new Date() },
  });

  return message;
}
