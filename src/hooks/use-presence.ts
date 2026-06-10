"use client";

import * as React from "react";
import { useSocket } from "./use-socket";

// Маппинг userId → status ("ONLINE" | "OFFLINE" | "AWAY" | "DO_NOT_DISTURB")
export function usePresence() {
  const { socket } = useSocket();

  React.useEffect(() => {
    if (!socket) return;

    const onPresence = (p: {
      userId: string;
      status: "ONLINE" | "OFFLINE" | "AWAY" | "DO_NOT_DISTURB";
      lastSeenAt?: number;
    }) => {
      // Пишем в custom event — пусть UI подпишется сам
      window.dispatchEvent(
        new CustomEvent("nextx:presence", {
          detail: { userId: p.userId, status: p.status, lastSeenAt: p.lastSeenAt },
        }),
      );
    };

    socket.on("presence:update", onPresence);
    return () => {
      socket.off("presence:update", onPresence);
    };
  }, [socket]);
}

// Удобный хук для получения статуса конкретного юзера
export function useUserStatus(userId: string | undefined) {
  const [status, setStatus] = React.useState<
    "ONLINE" | "OFFLINE" | "AWAY" | "DO_NOT_DISTURB" | null
  >(null);
  const [lastSeenAt, setLastSeenAt] = React.useState<number | undefined>();

  React.useEffect(() => {
    if (!userId) {
      setStatus(null);
      return;
    }
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        userId: string;
        status: typeof status;
        lastSeenAt?: number;
      };
      if (detail.userId === userId) {
        setStatus(detail.status);
        if (detail.lastSeenAt) setLastSeenAt(detail.lastSeenAt);
      }
    };
    window.addEventListener("nextx:presence", onEvent);
    return () => window.removeEventListener("nextx:presence", onEvent);
  }, [userId]);

  return { status, lastSeenAt };
}
