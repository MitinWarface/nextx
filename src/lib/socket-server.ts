/**
 * Server-side socket handlers: typing, presence, etc.
 * Идемпотентные операции делегируются в service-слой.
 */
import type { Server, Socket } from "socket.io";
import { prisma } from "./prisma";
import { setUserOffline, setUserOnline } from "./redis";

export function registerSocketHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;

  // При коннекте помечаем online
  void setUserOnline(userId);
  socket.broadcast.emit("presence:update", {
    userId,
    status: "ONLINE",
    lastSeen: Date.now(),
  });

  // ============================================================
  // Typing indicators (без сохранения в БД — fire and forget)
  // ============================================================
  socket.on("typing:start", (chatId: string) => {
    socket.to(`chat:${chatId}`).emit("typing:start", { chatId, userId });
  });

  socket.on("typing:stop", (chatId: string) => {
    socket.to(`chat:${chatId}`).emit("typing:stop", { chatId, userId });
  });

  // ============================================================
  // Disconnect → offline (если это последнее подключение юзера)
  // ============================================================
  socket.on("disconnect", async () => {
    try {
      const sockets = await io.in(`user:${userId}`).fetchSockets();
      if (sockets.length <= 1) {
        await setUserOffline(userId);
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
      console.error("[socket] disconnect handler failed:", err);
    }
  });
}
