"use client";

/**
 * useOfflineQueue — manages the offline action queue.
 * When socket reconnects, replays all queued actions.
 * Exposes isOnline status and queue size.
 */
import * as React from "react";
import { useSocket } from "./use-socket";
import { getQueuedActions, removeAction, clearQueue, getQueueSize, type OfflineAction } from "@/lib/offline-queue";

interface UseOfflineQueueResult {
  isOnline: boolean;
  queueSize: number;
  replayQueue: () => Promise<void>;
}

export function useOfflineQueue(): UseOfflineQueueResult {
  const { socket, status } = useSocket();
  const [isOnline, setIsOnline] = React.useState(true);
  const [queueSize, setQueueSize] = React.useState(0);
  const replayingRef = React.useRef(false);

  // Track online/offline status
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  // Update queue size periodically
  React.useEffect(() => {
    let cancelled = false;
    const update = async () => {
      const size = await getQueueSize();
      if (!cancelled) setQueueSize(size);
    };
    void update();
    const t = setInterval(update, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const replayQueue = React.useCallback(async () => {
    if (status !== "connected" || !socket) return;
    if (replayingRef.current) return;
    replayingRef.current = true;

    try {
      const actions = await getQueuedActions();
      if (actions.length === 0) return;

      let successCount = 0;
      for (const action of actions) {
        try {
          const ok = await replayAction(socket as any, action);
          if (ok) {
            await removeAction(action.id);
            successCount++;
          }
        } catch {
          // Action failed — leave in queue for next retry
        }
      }

      const remaining = await getQueueSize();
      setQueueSize(remaining);
    } finally {
      replayingRef.current = false;
    }
  }, [socket, status]);

  // Replay on socket reconnect
  React.useEffect(() => {
    if (status === "connected") {
      // Small delay to let socket stabilize
      const t = setTimeout(() => { void replayQueue(); }, 1000);
      return () => clearTimeout(t);
    }
  }, [status, replayQueue]);

  // Listen for visibility change (user returns to tab)
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.visibilityState === "visible" && status === "connected") {
        void replayQueue();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [status, replayQueue]);

  return { isOnline, queueSize, replayQueue };
}

async function replayAction(
  socket: any,
  action: OfflineAction,
): Promise<boolean> {
  const { type, payload } = action;
  switch (type) {
    case "send_message": {
      // Re-send via REST API (socket replay is complex for messages)
      const res = await fetch(`/api/chats/${payload.chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: payload.content,
          type: payload.messageType ?? "TEXT",
          replyToId: payload.replyToId,
          clientTempId: `replay-${action.id}`,
        }),
      });
      return res.ok;
    }
    case "reaction": {
      const method = payload.add === false ? "DELETE" : "POST";
      const res = await fetch(`/api/messages/${payload.messageId}/reactions`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emoji: payload.emoji }),
      });
      return res.ok;
    }
    case "read": {
      const res = await fetch(`/api/chats/${payload.chatId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId: payload.messageId }),
      });
      return res.ok;
    }
    case "draft": {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chatId: payload.chatId, content: payload.content }),
      });
      return res.ok;
    }
    default:
      return false;
  }
}
