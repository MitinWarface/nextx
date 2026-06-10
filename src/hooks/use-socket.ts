"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import type { AppSocket } from "@/types/socket";

let socket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

function connect(): Promise<Socket> {
  if (socket?.connected) return Promise.resolve(socket);
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    const s = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
    });

    s.on("connect", () => {
      socket = s;
      resolve(s);
    });
    s.on("connect_error", (err) => {
      s.close();
      connectionPromise = null;
      reject(err);
    });
  });

  return connectionPromise;
}

/**
 * Хук: возвращает типизированный сокет (один на всё приложение).
 * Подключается лениво — только при первом обращении.
 */
export function useSocket(): {
  socket: AppSocket | null;
  status: "idle" | "connecting" | "connected" | "error";
  error: Error | null;
} {
  const [status, setStatus] = React.useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("connecting");
    connect()
      .then(() => {
        if (!cancelled) setStatus("connected");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Не разрываем соединение на unmount — оставляем singleton
  return { socket: socket as AppSocket | null, status, error };
}

/** Получить текущий сокет (если уже подключён) */
export function getSocket(): Socket | null {
  return socket;
}
