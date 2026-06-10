/**
 * Custom Next.js server with integrated Socket.io.
 * Чистый JS (без tsx) — обходит баг tsx × Next.js 15 AsyncLocalStorage.
 *
 * Запуск: node server.js
 */
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { decode } from "next-auth/jwt";
import webpushLib from "web-push";
const webpush = webpushLib.default ?? webpushLib;

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

// ── Auto-seed premium plans & features on first boot ──
async function seedPremiumIfEmpty() {
  try {
    const count = await prisma.subscriptionPlan.count();
    if (count > 0) return; // already seeded

    console.log("🌱 Auto-seeding premium plans…");
    const featureData = [
      { code: "voice_to_text", name: "Расшифровка голосовых" },
      { code: "video_avatar", name: "Видеоаватары" },
      { code: "ai_rewrite", name: "AI-переписывание" },
      { code: "no_ads", name: "Без рекламы" },
      { code: "large_upload", name: "Большие файлы" },
      { code: "saved_tags", name: "Теги в Избранном" },
      { code: "task_lists", name: "Списки задач" },
      { code: "premium_stickers", name: "Премиум-стикеры" },
      { code: "premium_reactions", name: "Любые реакции" },
      { code: "premium_badge", name: "Premium-значок" },
    ];
    const featureMap = {};
    for (const f of featureData) {
      const row = await prisma.feature.upsert({ where: { code: f.code }, update: {}, create: f });
      featureMap[f.code] = row.id;
    }

    const planDefs = [
      { name: "FREE", durationDays: 0, priceKopecks: 0, sortOrder: 0, featureCodes: [], isPopular: false },
      { name: "PLUS", durationDays: 30, priceKopecks: 29900, sortOrder: 1, featureCodes: ["no_ads", "large_upload", "premium_badge"], isPopular: false },
      { name: "PREMIUM", durationDays: 30, priceKopecks: 59900, sortOrder: 2, featureCodes: ["no_ads", "large_upload", "premium_badge", "voice_to_text", "video_avatar", "ai_rewrite", "premium_stickers", "premium_reactions", "saved_tags", "task_lists"], isPopular: true },
      { name: "BUSINESS", durationDays: 30, priceKopecks: 149900, sortOrder: 3, featureCodes: ["no_ads", "large_upload", "premium_badge", "voice_to_text", "video_avatar", "ai_rewrite", "premium_stickers", "premium_reactions", "saved_tags", "task_lists"], isPopular: false },
    ];
    for (const p of planDefs) {
      const plan = await prisma.subscriptionPlan.upsert({
        where: { id: `seed_${p.name}` },
        update: { priceKopecks: p.priceKopecks },
        create: { id: `seed_${p.name}`, name: p.name, durationDays: p.durationDays, priceKopecks: p.priceKopecks, isPopular: p.isPopular, sortOrder: p.sortOrder },
      });
      for (const code of p.featureCodes) {
        const fid = featureMap[code];
        if (fid) {
          await prisma.planFeature.upsert({ where: { planId_featureId: { planId: plan.id, featureId: fid } }, update: {}, create: { planId: plan.id, featureId: fid } }).catch(() => {});
        }
      }
    }
    console.log("✅ Premium plans seeded: FREE, PLUS, PREMIUM, BUSINESS");
  } catch (e) {
    console.error("Premium seed error:", e);
  }
}
seedPremiumIfEmpty();

// VAPID setup (Web Push)
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:dev@chatgram.local";
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log("▲ Web Push: VAPID configured");
} else {
  console.warn("⚠ Web Push: VAPID keys not configured, push disabled");
}

async function sendPushToOfflineUser(userId, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const sockets = await ioInstance.in(`user:${userId}`).fetchSockets();
    if (sockets.length > 0) return; // онлайн — не нужно
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 24 },
          );
        } catch (err) {
          const status = err && err.statusCode;
          if (status === 404 || status === 410) {
            await prisma.pushSubscription
              .delete({ where: { id: s.id } })
              .catch(() => undefined);
          }
        }
      }),
    );
  } catch (err) {
    console.error("[push] send failed:", err);
  }
}

// ============================================================
// SMART PUSH BATCHING
// Накапливает push-уведомления по 5 сек и отправляет одним пакетом.
// Использует Redis для хранения очереди с TTL.
// ============================================================
const PUSH_BATCH_TTL = 5; // секунд
const PUSH_BATCH_MAX = 10; // макс. сообщений в пакете перед досрочной отправкой
const pushBatches = new Map(); // userId -> { timer, messages }

function schedulePushBatch(userId) {
  if (pushBatches.has(userId)) return;
  const batch = { timer: null, messages: [] };
  pushBatches.set(userId, batch);
  batch.timer = setTimeout(() => {
    flushPushBatch(userId);
  }, PUSH_BATCH_TTL * 1000);
}

function flushPushBatch(userId) {
  const batch = pushBatches.get(userId);
  if (!batch) return;
  clearTimeout(batch.timer);
  pushBatches.delete(userId);

  const msgs = batch.messages;
  if (msgs.length === 0) return;

  if (msgs.length === 1) {
    // Одно сообщение — обычная отправка
    void sendPushToOfflineUser(userId, msgs[0].payload);
    return;
  }

  // Батч: группируем по чату
  const byChat = new Map();
  for (const m of msgs) {
    const cid = m.chatId;
    if (!byChat.has(cid)) byChat.set(cid, []);
    byChat.get(cid).push(m);
  }

  let total = 0;
  const parts = [];
  for (const [chatId, chatMsgs] of byChat) {
    total += chatMsgs.length;
    const chatName = chatMsgs[0].chatName ?? "Чат";
    if (chatMsgs.length === 1) {
      parts.push(`${chatMsgs[0].senderName}: ${chatMsgs[0].preview}`);
    } else {
      parts.push(`${chatMsgs.length} сообщений от ${chatMsgs[0].senderName}`);
    }
  }

  const title = total === 1 ? msgs[0].chatName ?? "NextX" : `NextX: ${total} новых сообщений`;
  const body = parts.join("\n");
  const chatId = msgs[0].chatId;

  void sendPushToOfflineUser(userId, {
    title,
    body: body.slice(0, 200),
    tag: `chat-${chatId}`,
    data: { chatId, url: `/?chat=${chatId}` },
  });
}

function addToPushBatch(userId, chatId, senderName, preview, chatName) {
  const batch = pushBatches.get(userId);
  if (batch) {
    batch.messages.push({ chatId, senderName, preview, chatName });
    if (batch.messages.length >= PUSH_BATCH_MAX) {
      flushPushBatch(userId);
    }
    return;
  }
  // Первая запись — создаём батч
  schedulePushBatch(userId);
  const b = pushBatches.get(userId);
  if (b) b.messages.push({ chatId, senderName, preview, chatName });
}

let ioInstance = null;

// NextAuth v4 cookie names: dev — без префикса, prod — __Secure-
const SESSION_COOKIES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

async function authenticateSocket(req) {
  const cookieHeader = req.headers.cookie ?? "";
  let token;
  for (const name of SESSION_COOKIES) {
    const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    if (m) {
      token = decodeURIComponent(m[1]);
      break;
    }
  }
  if (!token) return null;
  try {
    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET ?? "",
    });
    const userId = decoded?.uid;
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    return user;
  } catch {
    return null;
  }
}

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

// Явно указываем dir — обязательно для кастомного сервера
const app = next({ dev, hostname, port, dir: process.cwd() });
const handle = app.getRequestHandler();

async function bootstrap() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL ?? `http://${hostname}:${port}`,
      credentials: true,
    },
    path: "/api/socket",
    transports: ["websocket", "polling"],
  });
  ioInstance = io;
  globalThis.__ioInstance = io;

  io.use(async (socket, nextFn) => {
    try {
      const user = await authenticateSocket(socket.request);
      if (!user) {
        nextFn(new Error("unauthorized"));
        return;
      }
      socket.data.userId = user.id;
      socket.data.username = user.username;
      nextFn();
    } catch (err) {
      nextFn(err instanceof Error ? err : new Error("auth failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    // Подписка на pubsub:chat:* — fan-out в локальные сокеты
    const subscriber = redis.duplicate();
    const subscribedChats = new Set();

    const subscribeChat = (chatId) => {
      if (subscribedChats.has(chatId)) return;
      subscribedChats.add(chatId);
      subscriber.subscribe(`pubsub:chat:${chatId}`);
    };

    subscriber.on("message", async (channel, payload) => {
      if (channel.startsWith("pubsub:chat:")) {
        const chatId = channel.replace("pubsub:chat:", "");
        const data = JSON.parse(payload);
        if (data && data._event === "reaction") {
          io.to(`chat:${chatId}`).emit("reaction:updated", {
            chatId,
            messageId: data.messageId,
            reactions: data.reactions,
          });
        } else if (data && data._event === "pin") {
          io.to(`chat:${chatId}`).emit("message:pinned", {
            chatId,
            messageId: data.messageId,
            isPinned: data.isPinned,
            pinnedAt: data.pinnedAt,
            pinnedById: data.pinnedById,
            message: data.message,
          });
        } else if (data && data._event === "poll") {
          io.to(`chat:${chatId}`).emit("poll:updated", {
            chatId,
            messageId: data.messageId,
            pollId: data.pollId,
            results: data.results,
            totalVotes: data.totalVotes,
          });
        } else if (data && data._event === "edited") {
          io.to(`chat:${chatId}`).emit("message:edited", {
            chatId,
            messageId: data.messageId,
            content: data.content,
            isEdited: data.isEdited,
          });
        } else if (data && data._event === "deleted") {
          io.to(`chat:${chatId}`).emit("message:deleted", {
            chatId,
            messageId: data.messageId,
          });
        } else if (data && data._event === "read") {
          io.to(`chat:${chatId}`).emit("message:read", {
            chatId,
            userId: data.userId,
            messageId: data.messageId,
          });
        } else {
          io.to(`chat:${chatId}`).emit("message:new", data);
          // Web Push: уведомляем оффлайн-участников чата
          try {
            const participants = await prisma.participant.findMany({
              where: { chatId },
              select: { userId: true },
            });
            const senderId = data?.senderId;
            const senderRow = senderId
              ? await prisma.user.findUnique({
                  where: { id: senderId },
                  select: { displayName: true, username: true },
                })
              : null;
            const senderName = senderRow?.displayName || senderRow?.username || "Кто-то";
            const chatRow = await prisma.chat.findUnique({
              where: { id: chatId },
              select: { name: true, type: true, participants: { select: { userId: true, user: { select: { displayName: true } } } } },
            });
            const otherUsers = participants
              .filter((p) => p.userId !== senderId)
              .map((p) => p.userId);
            const preview =
              data?.content?.slice(0, 120) ||
              (data?.mediaUrl ? "📎 Вложение" : "");
            // Smart batched push
            for (const uid of otherUsers) {
              addToPushBatch(uid, chatId, senderName, preview, chatRow?.name ?? null);
            }
          } catch (err) {
            console.error("[push] fanout failed:", err);
          }
        }
      }
    });

    socket.on("chat:join", (chatId) => {
      if (typeof chatId !== "string") return;
      socket.join(`chat:${chatId}`);
      subscribeChat(chatId);
    });

    // ============================================================
    // Welcome Bot: send welcome message when a new participant is added
    // ============================================================
    socket.on("participant:add", async (p) => {
      if (!p || !p.chatId || !p.userId) return;
      try {
        const chat = await prisma.chat.findUnique({
          where: { id: p.chatId },
          select: { id: true, type: true, welcomeMessage: true },
        });
        if (!chat || !chat.welcomeMessage) return;
        if (chat.type !== "GROUP" && chat.type !== "CHANNEL") return;

        const sysMsg = await prisma.message.create({
          data: {
            chatId: p.chatId,
            senderId: p.userId,
            type: "TEXT",
            content: chat.welcomeMessage,
            serviceType: "SYSTEM",
          },
          include: {
            sender: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
          },
        });

        io.to(`chat:${p.chatId}`).emit("message:new", {
          id: sysMsg.id,
          chatId: sysMsg.chatId,
          senderId: sysMsg.senderId,
          sender: sysMsg.sender,
          type: sysMsg.type,
          content: sysMsg.content,
          serviceType: sysMsg.serviceType,
          createdAt: sysMsg.createdAt,
        });
      } catch (err) {
        console.error("[welcome-bot] socket participant:add:", err.message);
      }
    });

    socket.on("chat:leave", (chatId) => {
      if (typeof chatId !== "string") return;
      socket.leave(`chat:${chatId}`);
    });

    // Typing
    socket.on("typing:start", (chatId) => {
      socket.to(`chat:${chatId}`).emit("typing:start", { chatId, userId });
    });
    socket.on("typing:stop", (chatId) => {
      socket.to(`chat:${chatId}`).emit("typing:stop", { chatId, userId });
    });

    // ============================================================
    // WebRTC signaling (calls)
    // Используем персональные комнаты user:<userId>
    // ============================================================
    socket.on("call:offer", (p) => {
      if (!p || !p.callId || !p.to) return;
      ioInstance.to(`user:${p.to}`).emit("call:offer", {
        callId: p.callId,
        from: p.from,
        sdp: p.sdp,
        kind: p.kind ?? "AUDIO",
      });
    });
    socket.on("call:answer", (p) => {
      if (!p || !p.callId || !p.to) return;
      ioInstance.to(`user:${p.to}`).emit("call:answer", {
        callId: p.callId,
        sdp: p.sdp,
      });
    });
    socket.on("call:ice", (p) => {
      if (!p || !p.callId || !p.to) return;
      ioInstance.to(`user:${p.to}`).emit("call:ice", {
        callId: p.callId,
        candidate: p.candidate,
      });
    });
    socket.on("call:hangup", (p) => {
      if (!p || !p.callId || !p.to) return;
      ioInstance.to(`user:${p.to}`).emit("call:hangup", { callId: p.callId });
    });
    socket.on("call:decline", (p) => {
      if (!p || !p.callId || !p.to) return;
      ioInstance.to(`user:${p.to}`).emit("call:decline", { callId: p.callId });
    });

    // ============================================================
    // Group calls (mesh WebRTC)
    // ============================================================
    socket.on("call:group-invite", (p) => {
      if (!p || !p.callId || !p.chatId) return;
      // Рассылаем всем участникам чата кроме себя
      ioInstance.to(`chat:${p.chatId}`).emit("call:group-invite", {
        chatId: p.chatId,
        callId: p.callId,
        from: p.from,
        kind: p.kind ?? "AUDIO",
      });
    });
    socket.on("call:group-peer", (p) => {
      if (!p || !p.callId || !p.to) return;
      ioInstance.to(`user:${p.to}`).emit("call:group-peer", {
        callId: p.callId,
        from: p.from,
        sdp: p.sdp,
      });
    });
    socket.on("call:group-answer", (p) => {
      if (!p || !p.callId || !p.to) return;
      ioInstance.to(`user:${p.to}`).emit("call:group-answer", {
        callId: p.callId,
        fromId: p.fromId,
        sdp: p.sdp,
      });
    });
    socket.on("call:group-ice", (p) => {
      if (!p || !p.callId || !p.to) return;
      ioInstance.to(`user:${p.to}`).emit("call:group-ice", {
        callId: p.callId,
        fromId: p.fromId,
        candidate: p.candidate,
      });
    });
    socket.on("call:group-leave", (p) => {
      if (!p || !p.callId) return;
      ioInstance.to(`chat:${p.chatId ?? ""}`).emit("call:group-leave", {
        callId: p.callId,
      });
    });

    // ============================================================
    // Co-watching (synchronized video playback)
    // ============================================================
    socket.on("cowatch:join", (p) => {
      if (!p || !p.sessionId) return;
      socket.join(`cowatch:${p.sessionId}`);
      ioInstance.to(`cowatch:${p.sessionId}`).emit("cowatch:viewer-joined", {
        sessionId: p.sessionId,
        userId,
        username: socket.data.username,
      });
    });

    socket.on("cowatch:leave", (p) => {
      if (!p || !p.sessionId) return;
      socket.leave(`cowatch:${p.sessionId}`);
      ioInstance.to(`cowatch:${p.sessionId}`).emit("cowatch:viewer-left", {
        sessionId: p.sessionId,
        userId,
      });
    });

    socket.on("cowatch:sync", (p) => {
      if (!p || !p.sessionId) return;
      // Relay sync events (play/pause/seek) to all other viewers in the session
      socket.to(`cowatch:${p.sessionId}`).emit("cowatch:sync", {
        sessionId: p.sessionId,
        action: p.action,    // "play" | "pause" | "seek" | "time"
        currentTime: p.currentTime,
        userId,
      });
    });

    socket.on("cowatch:chat", (p) => {
      if (!p || !p.sessionId || !p.message) return;
      ioInstance.to(`cowatch:${p.sessionId}`).emit("cowatch:chat", {
        sessionId: p.sessionId,
        userId,
        username: socket.data.username,
        message: p.message,
        createdAt: Date.now(),
      });
    });

    // Presence online
    void (async () => {
      try {
        await redis.hset(`presence:${userId}`, {
          status: "ONLINE",
          lastSeen: Date.now().toString(),
        });
        await redis.expire(`presence:${userId}`, 30 * 60);
      } catch {}
    })();
    socket.broadcast.emit("presence:update", {
      userId,
      status: "ONLINE",
      lastSeen: Date.now(),
    });

    socket.on("disconnect", async () => {
      try {
        const sockets = await io.in(`user:${userId}`).fetchSockets();
        if (sockets.length <= 1) {
          await redis.hset(`presence:${userId}`, {
            status: "OFFLINE",
            lastSeen: Date.now().toString(),
          });
          await prisma.user.update({
            where: { id: userId },
            data: { status: "OFFLINE", lastSeenAt: new Date() },
          });
          socket.broadcast.emit("presence:update", {
            userId,
            status: "OFFLINE",
            lastSeen: Date.now(),
          });
        }
      } catch (err) {
        console.error("[socket] disconnect:", err);
      } finally {
        await subscriber.quit();
      }
    });
  });

  // ── Scheduled messages scheduler (every 30 seconds) ──
  setInterval(async () => {
    try {
      const now = new Date();
      const due = await prisma.message.findMany({
        where: { isScheduled: true, scheduledFor: { lte: now }, isDeleted: false },
        take: 20,
      });
      for (const msg of due) {
        await prisma.message.update({
          where: { id: msg.id },
          data: { isScheduled: false, scheduledFor: null },
        });
        // Fetch sender info for complete payload
        const sender = await prisma.user.findUnique({
          where: { id: msg.senderId },
          select: { id: true, displayName: true, avatarUrl: true, username: true },
        });
        io.to(`chat:${msg.chatId}`).emit("message:new", {
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          sender: sender ? { id: sender.id, displayName: sender.displayName, avatarUrl: sender.avatarUrl, username: sender.username } : null,
          type: msg.type,
          content: msg.content,
          mediaUrl: msg.mediaUrl,
          thumbnailUrl: msg.thumbnailUrl,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          createdAt: msg.createdAt,
        });
      }
    } catch (e) {
      console.error("Scheduled msg cron:", e.message);
    }
  }, 30_000);

  // ── Recurring messages scheduler (every 60 seconds) ──
  setInterval(async () => {
    try {
      const now = new Date();
      const due = await prisma.recurringMessage.findMany({
        where: { isActive: true, nextSendAt: { lte: now } },
        take: 20,
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
        },
      });
      for (const rm of due) {
        // Send the message
        await prisma.message.create({
          data: {
            chatId: rm.chatId,
            senderId: rm.userId,
            type: "TEXT",
            content: rm.content,
          },
        });

        // Calculate next send time
        const next = new Date(rm.nextSendAt);
        switch (rm.recurrence) {
          case "daily":
            next.setDate(next.getDate() + 1);
            break;
          case "weekly":
            next.setDate(next.getDate() + 7);
            break;
          case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
          default:
            // Unknown recurrence — deactivate
            await prisma.recurringMessage.update({
              where: { id: rm.id },
              data: { isActive: false, lastSentAt: now },
            });
            continue;
        }

        await prisma.recurringMessage.update({
          where: { id: rm.id },
          data: { nextSendAt: next, lastSentAt: now },
        });

        // Emit via socket
        io.to(`chat:${rm.chatId}`).emit("message:new", {
          chatId: rm.chatId,
          senderId: rm.userId,
          sender: rm.user ? { id: rm.user.id, displayName: rm.user.displayName, avatarUrl: rm.user.avatarUrl, username: rm.user.username } : null,
          type: "TEXT",
          content: rm.content,
          createdAt: new Date(),
        });
      }
    } catch (e) {
      console.error("Recurring messages scheduler error:", e);
    }
  }, 60_000);

  // ── Premium expiry checker (every 5 minutes) ──
  setInterval(async () => {
    try {
      // Deactivate expired
      const result = await prisma.user.updateMany({
        where: { premiumStatus: "active", premiumUntil: { lt: new Date() } },
        data: { premiumStatus: "expired" },
      });
      if (result.count > 0) {
        console.log(`Premium expired for ${result.count} users`);
      }

      // Notify users whose premium expires in 3 days
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const aboutToExpire = await prisma.user.findMany({
        where: {
          premiumStatus: "active",
          premiumUntil: { gt: new Date(), lt: threeDaysFromNow },
        },
        select: { id: true },
      });

      for (const user of aboutToExpire) {
        try {
          const selfChat = await prisma.chat.findFirst({
            where: { type: "SERVICE", participants: { some: { userId: user.id } } },
          });
          if (!selfChat) continue;

          const exists = await prisma.message.findFirst({
            where: {
              chatId: selfChat.id,
              serviceType: "SECURITY",
              content: { contains: "срок действия подписки" },
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          });
          if (exists) continue;

          await prisma.message.create({
            data: {
              chatId: selfChat.id,
              senderId: user.id,
              type: "TEXT",
              content: "⏰ Срок действия подписки Premium истекает через 3 дня. Продлите подписку, чтобы сохранить доступ к функциям.",
              serviceType: "SECURITY",
            },
          });
        } catch {}
      }
    } catch (e) {
      console.error("Premium expiry check error:", e);
    }
  }, 5 * 60_000);

  // ── Auto-cleanup old inactive devices (every hour) ──
  setInterval(async () => {
    try {
      // Server default: 6 months. Users with sessionCleanupDays set get faster cleanup.
      const defaultCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const result = await prisma.device.updateMany({
        where: { lastActivity: { lt: defaultCutoff }, isRevoked: false },
        data: { isRevoked: true },
      });
      if (result.count > 0) {
        console.log(`Auto-revoked ${result.count} inactive devices (>${Math.floor(180)} days)`);
      }

      // Per-user cleanup based on sessionCleanupDays preference
      const usersWithPref = await prisma.user.findMany({
        where: { sessionCleanupDays: { not: null } },
        select: { id: true, sessionCleanupDays: true },
      });
      for (const u of usersWithPref) {
        const days = u.sessionCleanupDays;
        if (!days || days <= 0) continue;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const revoked = await prisma.device.updateMany({
          where: { userId: u.id, lastActivity: { lt: cutoff }, isRevoked: false },
          data: { isRevoked: true },
        });
        if (revoked.count > 0) {
          console.log(`Auto-revoked ${revoked.count} devices for user ${u.id} (>${days} days)`);
        }
      }
    } catch (e) {
      console.error("Device cleanup error:", e);
    }
  }, 60 * 60_000);

  // ── Auto-archive expired temporary groups (every 5 minutes) ──
  setInterval(async () => {
    try {
      const now = new Date();
      const expired = await prisma.chat.updateMany({
        where: {
          autoArchive: true,
          expiresAt: { not: null, lte: now },
          isArchived: false,
        },
        data: { isArchived: true },
      });
      if (expired.count > 0) {
        console.log(`Auto-archived ${expired.count} expired temporary groups`);
      }
    } catch (e) {
      console.error("Auto-archive error:", e);
    }
  }, 5 * 60_000);

  // ── Daily login bonus (1 NC per day, runs every hour) ──
  setInterval(async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Find online users who haven't received today's bonus
      const onlineUserIds = [];
      const sockets = await io.in("user:*").fetchSockets();
      for (const s of sockets) {
        if (s.data?.userId) onlineUserIds.push(s.data.userId);
      }
      if (onlineUserIds.length === 0) return;

      for (const userId of onlineUserIds) {
        try {
          const alreadyClaimed = await prisma.dailyLogin.findUnique({
            where: { userId_loginDate: { userId, loginDate: startOfDay } },
          });
          if (alreadyClaimed) continue;

          await prisma.dailyLogin.create({
            data: { userId, loginDate: startOfDay, reward: 1 },
          });

          const wallet = await prisma.wallet.upsert({
            where: { userId },
            update: { balance: { increment: 1 } },
            create: { userId, balance: 1 },
          });

          await prisma.economyLog.create({
            data: {
              userId,
              type: "earn",
              source: "daily_login",
              amount: 1,
              balance: wallet.balance,
              details: "Daily login bonus",
            },
          });
        } catch (e) {
          // Non-critical — skip per-user errors
        }
      }
    } catch (e) {
      console.error("Daily login bonus error:", e);
    }
  }, 60 * 60_000);

  // ── Reminder checker (every 60 seconds) ──
  setInterval(async () => {
    try {
      const now = new Date();
      const dueReminders = await prisma.reminder.findMany({
        where: {
          isCompleted: false,
          remindAt: { lte: now },
        },
        take: 20,
        include: {
          user: { select: { id: true, displayName: true } },
          chat: { select: { id: true, name: true, type: true } },
        },
      });

      for (const reminder of dueReminders) {
        // Send service message to the user's self-chat
        try {
          const selfChat = await prisma.chat.findFirst({
            where: {
              type: "SERVICE",
              participants: { some: { userId: reminder.userId } },
            },
          });
          if (selfChat) {
            const reminderText = reminder.text || "Напоминание";
            const chatLabel = reminder.chat?.name || "чат";
            await prisma.message.create({
              data: {
                chatId: selfChat.id,
                senderId: reminder.userId,
                type: "TEXT",
                content: `🔔 Напоминание: "${reminderText}" (чат: ${chatLabel})`,
                serviceType: "SYSTEM",
              },
            });
          }
        } catch (msgErr) {
          console.error("[reminder] failed to send service message:", msgErr);
        }

        // Handle recurrence or mark complete
        if (reminder.recurrence && reminder.recurrence !== "none") {
          const nextDate = new Date(reminder.remindAt);
          switch (reminder.recurrence) {
            case "daily":
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case "weekly":
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case "monthly":
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
          }
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { remindAt: nextDate },
          });
        } else {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { isCompleted: true },
          });
        }

        // Emit via socket if user is online
        const io = globalThis.__ioInstance;
        if (io) {
          io.to(`user:${reminder.userId}`).emit("reminder:due", {
            id: reminder.id,
            text: reminder.text,
            chatId: reminder.chatId,
            chatName: reminder.chat?.name,
          });
        }

        // Send push notification
        await sendPushToOfflineUser(reminder.userId, {
          title: "Напоминание",
          body: (reminder.text || "Напоминание").slice(0, 200),
          tag: `reminder-${reminder.id}`,
          data: { reminderId: reminder.id, chatId: reminder.chatId, url: `/?chat=${reminder.chatId}` },
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Reminder cron:", e.message);
    }
  }, 60_000);

  // ── Auto-post: check RSS/YouTube feeds every 5 minutes ──
  const RSS_CHECK_INTERVAL = 5 * 60_000;

  function parseRssItems(xml) {
    const items = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];
    for (const item of itemMatches) {
      const title = (item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ?? item.match(/<title>([\s\S]*?)<\/title>/i))?.[1]?.trim();
      const link = item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim();
      const description = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ?? item.match(/<description>([\s\S]*?)<\/description>/i))?.[1]?.trim();
      if (title && link) {
        items.push({ title, link, description: description ?? "" });
      }
    }
    return items;
  }

  function parseYouTubeEntries(xml) {
    const items = [];
    const entryMatches = xml.match(/<entry>([\s\S]*?)<\/entry>/gi) ?? [];
    for (const entry of entryMatches) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
      const link = entry.match(/<link[^>]*href="([^"]+)"/i)?.[1];
      const published = entry.match(/<published>([\s\S]*?)<\/published>/i)?.[1]?.trim();
      if (title && link) {
        items.push({ title, link, description: `New video: ${title}`, published });
      }
    }
    return items;
  }

  async function checkAutoPostSources() {
    try {
      const sources = await prisma.autoPostSource.findMany({
        where: { OR: [{ type: "RSS" }, { type: "YOUTUBE" }] },
        include: { chat: { select: { id: true, name: true } } },
      });

      for (const source of sources) {
        try {
          const res = await fetch(source.url, {
            signal: AbortSignal.timeout(15_000),
            headers: { "User-Agent": "NextX-AutoPost/1.0" },
          });
          if (!res.ok) continue;
          const xml = await res.text();

          const items = source.type === "YOUTUBE" ? parseYouTubeEntries(xml) : parseRssItems(xml);

          // Get last posted link for this source to avoid duplicates
          const lastMsg = await prisma.message.findFirst({
            where: {
              chatId: source.chatId,
              serviceType: "AUTO_POST",
              content: { contains: source.url },
            },
            orderBy: { createdAt: "desc" },
            select: { content: true, createdAt: true },
          });

          // Extract last posted title from the service message content
          const lastTitle = lastMsg?.content?.match(/🔗 (.+)/)?.[1] ?? "";

          let newItems = items;
          if (lastTitle) {
            const lastIdx = items.findIndex((i) => i.title === lastTitle);
            if (lastIdx >= 0) {
              newItems = items.slice(0, lastIdx);
            }
          }

          // Post at most 5 items per check to avoid flooding
          const toPost = newItems.slice(0, 5);

          for (const item of toPost) {
            // Find the bot user or first admin of the chat to post as sender
            const participant = await prisma.participant.findFirst({
              where: { chatId: source.chatId, role: "OWNER" },
              select: { userId: true },
            });
            const senderId = participant?.userId;
            if (!senderId) continue;

            const content = `📰 **${item.title}**\n\n${item.description ? item.description.slice(0, 500) + "\n\n" : ""}🔗 ${item.link}\n\n---\n*Auto-posted from ${source.type === "YOUTUBE" ? "YouTube" : "RSS"}: ${source.url}*`;

            await prisma.message.create({
              data: {
                chatId: source.chatId,
                senderId,
                type: "TEXT",
                content,
                serviceType: "AUTO_POST",
              },
            });
          }

          // Update lastCheck
          await prisma.autoPostSource.update({
            where: { id: source.id },
            data: { lastCheck: new Date() },
          });

          if (toPost.length > 0) {
            console.log(`[auto-post] Posted ${toPost.length} items from ${source.type} to chat ${source.chatId}`);

            // Notify via socket
            const io = globalThis.__ioInstance;
            if (io) {
              for (const item of toPost) {
                io.to(`chat:${source.chatId}`).emit("message:new", {
                  chatId: source.chatId,
                  type: "TEXT",
                  content: `📰 **${item.title}**\n\n🔗 ${item.link}`,
                  serviceType: "AUTO_POST",
                  createdAt: new Date(),
                });
              }
            }
          }
        } catch (err) {
          console.error(`[auto-post] Error checking source ${source.id}:`, err.message ?? err);
        }
      }
    } catch (e) {
      console.error("Auto-post check error:", e);
    }
  }

  setInterval(checkAutoPostSources, RSS_CHECK_INTERVAL);
  // Run once on startup after a short delay
  setTimeout(checkAutoPostSources, 30_000);

  httpServer.listen(port, () => {
    console.log(`▲ Next.js ready on http://${hostname}:${port}`);
    console.log(`◉ Socket.io listening on path /api/socket`);
  });
}

bootstrap().catch((err) => {
  console.error("Server bootstrap failed:", err);
  process.exit(1);
});
