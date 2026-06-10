import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ============================================================
// Ключи для кэша сообщений и метаданных
// ============================================================
// chat:{chatId}:messages — Sorted Set последних N сообщений (score = timestamp)
// chat:{chatId}:msg:{messageId} — JSON одного сообщения
// user:{userId}:unread — Hash с количеством непрочитанных по чатам
// user:{userId}:chats — список ID чатов пользователя
// presence:{userId} — статус (online/offline/away) + lastSeen
// pubsub:chat:{chatId} — канал публикации новых сообщений
// ============================================================

export const REDIS_KEYS = {
  chatMessages: (chatId: string) => `chat:${chatId}:messages`,
  chatMessage: (chatId: string, messageId: string) =>
    `chat:${chatId}:msg:${messageId}`,
  userUnread: (userId: string) => `user:${userId}:unread`,
  userChats: (userId: string) => `user:${userId}:chats`,
  presence: (userId: string) => `presence:${userId}`,
  chatChannel: (chatId: string) => `pubsub:chat:${chatId}`,
} as const;

export const REDIS_TTL = {
  chatMessages: 60 * 60 * 24, // 24 часа
  presence: 60 * 30, // 30 минут
  unread: 60 * 60 * 24 * 7, // 7 дней
} as const;

/**
 * Публикация события в канал чата — для fan-out через Redis pub/sub
 * (используется custom Socket.io сервером)
 */
export async function publishNewMessage(
  chatId: string,
  payload: unknown,
): Promise<void> {
  await redis.publish(REDIS_KEYS.chatChannel(chatId), JSON.stringify(payload));
}

export async function cacheMessage(
  chatId: string,
  message: CachedMessage,
): Promise<void> {
  return pushMessageToCache(chatId, message);
}

// ============================================================
// Хелперы для работы с сообщениями
// ============================================================

export interface CachedMessage {
  id: string;
  chatId: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  replyToId: string | null;
  createdAt: number; // unix ms
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

const MAX_CACHED_MESSAGES = 100;

export async function pushMessageToCache(
  chatId: string,
  message: CachedMessage,
): Promise<void> {
  const key = REDIS_KEYS.chatMessages(chatId);
  const pipeline = redis.pipeline();
  pipeline.zadd(key, message.createdAt, message.id);
  pipeline.set(
    REDIS_KEYS.chatMessage(chatId, message.id),
    JSON.stringify(message),
    "EX",
    REDIS_TTL.chatMessages,
  );
  // Обрезаем до MAX_CACHED_MESSAGES последних
  pipeline.zremrangebyrank(key, 0, -(MAX_CACHED_MESSAGES + 1));
  pipeline.expire(key, REDIS_TTL.chatMessages);
  await pipeline.exec();
}

export async function getRecentMessages(
  chatId: string,
  limit = 50,
): Promise<CachedMessage[]> {
  const ids = await redis.zrevrange(
    REDIS_KEYS.chatMessages(chatId),
    0,
    limit - 1,
  );
  if (ids.length === 0) return [];
  const values = await redis.mget(
    ids.map((id) => REDIS_KEYS.chatMessage(chatId, id)),
  );
  return values
    .filter((v): v is string => v !== null)
    .map((v) => JSON.parse(v) as CachedMessage);
}

// ============================================================
// Presence (статусы пользователей)
// ============================================================

export async function setUserOnline(userId: string): Promise<void> {
  await redis.hset(REDIS_KEYS.presence(userId), {
    status: "online",
    lastSeen: Date.now().toString(),
  });
  await redis.expire(REDIS_KEYS.presence(userId), REDIS_TTL.presence);
}

export async function setUserOffline(userId: string): Promise<void> {
  await redis.hset(REDIS_KEYS.presence(userId), {
    status: "offline",
    lastSeen: Date.now().toString(),
  });
}

export async function getPresence(
  userId: string,
): Promise<{ status: string; lastSeen: number } | null> {
  const data = await redis.hgetall(REDIS_KEYS.presence(userId));
  if (!data.status) return null;
  return {
    status: data.status,
    lastSeen: Number(data.lastSeen),
  };
}
