/**
 * Custom Next.js server with integrated Socket.io.
 *
 * Usage:
 *   1. In package.json: "dev": "tsx server.ts"
 *   2. Standalone:       node --import tsx server.ts
 *
 * Architecture:
 *   Client ── HTTP ──▶ Next.js (App Router handlers)
 *   Client ── WS   ──▶ Socket.io (rooms: chat:{chatId}, user:{userId})
 *   Server ── Redis pub/sub ──▶ Multi-instance fan-out (production)
 */
import { createServer, type IncomingMessage } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { redis, REDIS_KEYS } from "./src/lib/redis";
import { authenticateSocket } from "./src/lib/auth";
import { registerSocketHandlers } from "./src/lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function bootstrap() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  // ============================================================
  // Socket.io
  // ============================================================
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL ?? `http://${hostname}:${port}`,
      credentials: true,
    },
    path: "/api/socket",
    transports: ["websocket", "polling"],
  });

  // Auth middleware
  io.use(async (socket: Socket, nextFn) => {
    try {
      const user = await authenticateSocket(socket.request as IncomingMessage);
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
    const userId = socket.data.userId as string;
    // Личная комната пользователя (для personal notifications)
    socket.join(`user:${userId}`);

    // Подписка на pubsub из Redis → fan-out в локальные сокеты
    const subscriber = redis.duplicate();
    subscriber.on("message", (channel, payload) => {
      if (channel.startsWith("pubsub:chat:")) {
        const chatId = channel.replace("pubsub:chat:", "");
        // Отправляем только участникам чата
        io.to(`chat:${chatId}`).emit("message:new", JSON.parse(payload));
      } else if (channel === `pubsub:user:${userId}`) {
        socket.emit("notification", JSON.parse(payload));
      }
    });

    // Подпишемся на конкретные каналы по факту join-ов
    let subscribedChats = new Set<string>();
    const subscribeChat = (chatId: string) => {
      if (subscribedChats.has(chatId)) return;
      subscribedChats.add(chatId);
      void subscriber.subscribe(REDIS_KEYS.chatChannel(chatId));
    };

    socket.on("chat:join", (chatId: string) => {
      if (typeof chatId !== "string") return;
      socket.join(`chat:${chatId}`);
      subscribeChat(chatId);
    });

    socket.on("chat:leave", (chatId: string) => {
      if (typeof chatId !== "string") return;
      socket.leave(`chat:${chatId}`);
    });

    registerSocketHandlers(io, socket);

    socket.on("disconnect", () => {
      void subscriber.quit();
    });
  });

  httpServer.listen(port, () => {
    console.log(`▲ Next.js ready on http://${hostname}:${port}`);
    console.log(`◉ Socket.io listening on path /api/socket`);
  });
}

bootstrap().catch((err) => {
  console.error("Server bootstrap failed:", err);
  process.exit(1);
});
