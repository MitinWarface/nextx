"use client";

import * as React from "react";
import { useSocket } from "./use-socket";
import { useMessagesStore } from "@/store/messages-store";
import { useChatStore } from "@/store/chat-store";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { enqueueAction } from "@/lib/offline-queue";
import type { MessageDTO } from "@/types";

interface UseChatMessagesOptions {
  chatId: string | null;
  limit?: number;
}

interface UseChatMessagesResult {
  messages: MessageDTO[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  sendMessage: (
    text: string,
    attachments?: Array<{
      type: "IMAGE" | "VIDEO" | "AUDIO" | "VOICE" | "FILE" | "STICKER" | "LOCATION";
      url: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>,
    opts?: { replyToId?: string; mentions?: string[]; ttlSeconds?: number; keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>; scheduledFor?: string; isViewOnce?: boolean; isSilent?: boolean },
  ) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  togglePin: (messageId: string, pin: boolean) => Promise<void>;
  typingUsers: string[];
  startTyping: () => void;
  stopTyping: () => void;
}

const TYPING_THROTTLE_MS = 5_000;
const EMPTY_MESSAGES: MessageDTO[] = [];
const EMPTY_TYPING_SET = new Set<string>();

export function useChatMessages({
  chatId,
  limit = 50,
}: UseChatMessagesOptions): UseChatMessagesResult {
  const { socket } = useSocket();
  const myUserId = useAuthStore((s) => s.user?.id);
  const messages = useMessagesStore((s) =>
    chatId ? s.messagesByChat[chatId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES,
  );
  const typingSet = useMessagesStore((s) =>
    chatId ? s.typingByChat[chatId] ?? EMPTY_TYPING_SET : EMPTY_TYPING_SET,
  );
  const setAll = useMessagesStore((s) => s.setAll);
  const append = useMessagesStore((s) => s.append);
  const upsert = useMessagesStore((s) => s.upsert);
  const remove = useMessagesStore((s) => s.remove);
  const replaceByTempId = useMessagesStore((s) => s.replaceByTempId);
  const setReactions = useMessagesStore((s) => s.setReactions);
  const setTypingStore = useMessagesStore((s) => s.setTyping);
  const resetUnread = useChatStore((s) => s.resetUnread);

  const [isLoading, setIsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const cursorRef = React.useRef<string | null>(null);
  const inFlightRef = React.useRef(false);
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================
  // Загрузка истории
  // ============================================================
  const loadMore = React.useCallback(async () => {
    if (!chatId || inFlightRef.current || !hasMore) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursorRef.current) params.set("cursor", cursorRef.current);
      const res = await fetch(`/api/chats/${chatId}/messages?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        messages: MessageDTO[];
        nextCursor: string | null;
      };
      cursorRef.current = data.nextCursor;
      setHasMore(Boolean(data.nextCursor));
      const existing =
        useMessagesStore.getState().messagesByChat[chatId] ?? EMPTY_MESSAGES;
      setAll(chatId, [...data.messages, ...existing]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load_failed");
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [chatId, hasMore, limit, setAll]);

  const loadMoreRef = React.useRef(loadMore);
  loadMoreRef.current = loadMore;

  // Сброс при смене чата
  React.useEffect(() => {
    cursorRef.current = null;
    setHasMore(true);
    setError(null);
    if (!chatId) return;
    if ((useMessagesStore.getState().messagesByChat[chatId] ?? []).length === 0) {
      void loadMoreRef.current();
    } else {
      // Если сообщения уже есть в сторе, курсор указываем на самое раннее
      const list = useMessagesStore.getState().messagesByChat[chatId];
      if (list && list.length > 0) {
        cursorRef.current = list[0].createdAt;
      }
    }
    // mark as read при входе
    if (myUserId) {
      void fetch(`/api/chats/${chatId}/read`, {
        method: "POST",
        credentials: "include",
      });
      resetUnread(chatId);
    }
    // join socket room
    if (socket) socket.emit("chat:join", chatId);
    return () => {
      // сброс таймера typing и уведомление других о выходе
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
        if (socket) socket.emit("typing:stop", chatId);
      }
      if (socket && chatId) socket.emit("chat:leave", chatId);
    };
  }, [chatId, myUserId, resetUnread, socket]);

  // ============================================================
  // Подписка на socket-события
  // ============================================================
  React.useEffect(() => {
    if (!socket || !chatId) return;

    const onNew = (msg: MessageDTO) => {
      if (msg.chatId !== chatId) return;
      const list = useMessagesStore.getState().messagesByChat[chatId] ?? [];
      if (list.some((m) => m.id === msg.id)) return;
      if (msg.senderId === myUserId) {
        const optimistic = list.find(
          (m) =>
            m.status === "sending" &&
            m.content === msg.content &&
            m.senderId === myUserId,
        );
        if (optimistic) {
          replaceByTempId(chatId, optimistic.id, { ...msg, status: "delivered" });
          return;
        }
      }
      append(chatId, { ...msg, status: "delivered" });
    };

    const onEdited = (msg: MessageDTO) => {
      if (msg.chatId === chatId) upsert(chatId, msg);
    };

    const onPinned = (p: {
      chatId: string;
      messageId: string;
      isPinned: boolean;
      pinnedAt: string | null;
      pinnedById: string | null;
      message?: MessageDTO;
    }) => {
      if (p.chatId !== chatId) return;
      const list = useMessagesStore.getState().messagesByChat[chatId] ?? [];
      const idx = list.findIndex((m) => m.id === p.messageId);
      if (idx === -1) return;
      const updated = p.message ?? {
        ...list[idx],
        isPinned: p.isPinned,
        pinnedAt: p.pinnedAt,
        pinnedBy: p.pinnedById
          ? { id: p.pinnedById, displayName: "" }
          : null,
      };
      const next = list.slice();
      next[idx] = updated;
      useMessagesStore.setState((state) => ({
        messagesByChat: { ...state.messagesByChat, [chatId]: next },
      }));
    };

    const onDeleted = (p: { chatId: string; messageId: string }) => {
      if (p.chatId === chatId) remove(chatId, p.messageId);
    };

    const onRead = (p: { chatId: string; userId: string; messageId: string }) => {
      if (p.chatId !== chatId || p.userId === myUserId) return;
      const list = useMessagesStore.getState().messagesByChat[chatId] ?? [];
      // Batch: collect all updates, then apply once
      const updates: { idx: number; msg: MessageDTO }[] = [];
      for (const m of list) {
        if (
          m.senderId === myUserId &&
          m.status !== "read" &&
          m.id <= p.messageId
        ) {
          const idx = list.indexOf(m);
          updates.push({ idx, msg: { ...m, status: "read" } });
        }
      }
      if (updates.length === 0) return;
      useMessagesStore.setState((state) => {
        const cur = state.messagesByChat[chatId] ?? EMPTY_MESSAGES;
        const next = [...cur];
        for (const { idx, msg } of updates) next[idx] = msg;
        return { messagesByChat: { ...state.messagesByChat, [chatId]: next } };
      });
    };

    const onTypingStart = (p: { chatId: string; userId: string }) => {
      if (p.chatId === chatId && p.userId !== myUserId) {
        setTypingStore(chatId, p.userId, true);
      }
    };
    const onTypingStop = (p: { chatId: string; userId: string }) => {
      if (p.chatId === chatId) setTypingStore(chatId, p.userId, false);
    };

    const onReaction = (p: {
      chatId: string;
      messageId: string;
      reactions: MessageDTO["reactions"];
    }) => {
      if (p.chatId !== chatId) return;
      setReactions(chatId, p.messageId, p.reactions ?? []);
    };

    socket.on("message:new", onNew);
    socket.on("message:edited", onEdited);
    socket.on("message:pinned", onPinned);
    socket.on("message:deleted", onDeleted);
    socket.on("message:read", onRead);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("reaction:updated", onReaction);

    // Poll results real-time
    const onPollUpdated = (p: {
      chatId: string;
      messageId: string;
      pollId: string;
      results: Array<{ optionId: string; text: string; count: number; userIds: string[] }>;
      totalVotes: number;
    }) => {
      if (p.chatId !== chatId) return;
      // Найти текущее сообщение и обновить poll
      const list = useMessagesStore.getState().messagesByChat[chatId] ?? [];
      const msg = list.find((m) => m.id === p.messageId);
      if (msg && msg.poll) {
        const updatedMsg: MessageDTO = {
          ...msg,
          poll: {
            ...msg.poll,
            options: p.results.map((r) => ({
              id: r.optionId,
              text: r.text,
              count: r.count,
              userIds: r.userIds,
            })),
          },
        };
        upsert(chatId, updatedMsg);
      }
    };
    socket.on("poll:updated", onPollUpdated);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:edited", onEdited);
      socket.off("message:pinned", onPinned);
      socket.off("message:deleted", onDeleted);
      socket.off("message:read", onRead);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("reaction:updated", onReaction);
      socket.off("poll:updated", onPollUpdated);
    };
  }, [
    append,
    chatId,
    myUserId,
    remove,
    replaceByTempId,
    setReactions,
    setTypingStore,
    socket,
    upsert,
  ]);

  // ============================================================
  // Edit / Delete
  // ============================================================
  const editMessage = React.useCallback(
    async (messageId: string, content: string) => {
      if (!chatId) return;
      try {
        const res = await fetch(`/api/messages/${messageId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(err?.error ?? `HTTP ${res.status}`);
        }
        // socket event "message:edited" обновит стор
      } catch (err) {
        console.error("Edit failed:", err);
        toast.error("Не удалось отредактировать сообщение");
        throw err;
      }
    },
    [chatId],
  );

  const deleteMessage = React.useCallback(
    async (messageId: string) => {
      if (!chatId) return;
      try {
        const res = await fetch(`/api/messages/${messageId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.info("Сообщение удалено");
        // socket event "message:deleted" уберёт из стора
      } catch (err) {
        console.error("Delete failed:", err);
        toast.error("Не удалось удалить сообщение");
        throw err;
      }
    },
    [chatId],
  );

  const togglePin = React.useCallback(
    async (messageId: string, pin: boolean) => {
      if (!chatId) return;
      // Optimistic UI
      const list = useMessagesStore.getState().messagesByChat[chatId] ?? [];
      const msg = list.find((m) => m.id === messageId);
      if (msg) {
        upsert(chatId, { ...msg, isPinned: pin });
      }
      if (!navigator.onLine) {
        await enqueueAction({ type: "pin", payload: { messageId, pin, chatId } });
        toast.info("Оффлайн: действие будет выполнено при подключении");
        return;
      }
      try {
        const res = await fetch(`/api/messages/${messageId}/pin`, {
          method: pin ? "POST" : "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success(pin ? "Сообщение закреплено" : "Сообщение откреплено");
      } catch (err) {
        console.error("Toggle pin failed:", err);
        // Revert optimistic update
        if (msg) upsert(chatId, { ...msg, isPinned: !pin });
        await enqueueAction({ type: "pin", payload: { messageId, pin, chatId } });
        toast.error("Соединение потеряно: действие будет выполнено позже");
      }
    },
    [chatId, upsert],
  );

  // ============================================================
  // Реакции: добавить/удалить (Optimistic UI + socket sync)
  // ============================================================
  const toggleReaction = React.useCallback(
    async (messageId: string, emoji: string) => {
      if (!chatId || !myUserId) return;
      const list = useMessagesStore.getState().messagesByChat[chatId] ?? [];
      const msg = list.find((m) => m.id === messageId);
      if (!msg) return;
      const current = msg.reactions ?? [];
      const existing = current.find(
        (r) => r.emoji === emoji && r.userIds.includes(myUserId),
      );

      // Optimistic update
      const nextReactions = existing
        ? current
            .map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count - 1,
                    userIds: r.userIds.filter((id) => id !== myUserId),
                  }
                : r,
            )
            .filter((r) => r.count > 0)
        : current.map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.count + 1,
                  userIds: [...r.userIds, myUserId],
                }
              : r,
          );
      if (
        !existing &&
        !current.some((r) => r.emoji === emoji)
      ) {
        nextReactions.push({ emoji, count: 1, userIds: [myUserId] });
      }
      setReactions(chatId, messageId, nextReactions);

      if (!navigator.onLine) {
        await enqueueAction({ type: "reaction", payload: { messageId, emoji, add: !existing } });
        return;
      }

      try {
        const res = await fetch(
          `/api/messages/${messageId}/reactions`,
          {
            method: existing ? "DELETE" : "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { reactions: MessageDTO["reactions"] };
        setReactions(chatId, messageId, data.reactions ?? []);
      } catch {
        // Offline — queue for retry, optimistic stays
        await enqueueAction({ type: "reaction", payload: { messageId, emoji, add: !existing } });
      }
    },
    [chatId, myUserId, setReactions],
  );

  // ============================================================
  // Отправка сообщения (Optimistic UI + media)
  // ============================================================
  const sendMessage = React.useCallback(
    async (
      text: string,
      attachments: Array<{
        type: "IMAGE" | "VIDEO" | "AUDIO" | "VOICE" | "FILE" | "STICKER" | "LOCATION";
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      }> = [],
    opts?: { replyToId?: string; mentions?: string[]; ttlSeconds?: number; keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>; scheduledFor?: string; isViewOnce?: boolean; isSilent?: boolean },
    ) => {
      if (!chatId || !myUserId) return;
      const first = attachments[0];
      const hasMedia = attachments.length > 0;
      const type = hasMedia ? first.type : "TEXT";
      const tempId = `tmp-${crypto.randomUUID()}`;
      const optimistic: MessageDTO = {
        id: tempId,
        chatId,
        senderId: myUserId,
        type,
        content: text || null,
        mediaUrl: first?.url ?? null,
        thumbnailUrl: null,
        fileName: first?.fileName ?? null,
        fileSize: first?.fileSize ?? null,
        replyToId: opts?.replyToId ?? null,
        isEdited: false,
        isViewOnce: opts?.isViewOnce,
        createdAt: new Date().toISOString(),
        status: "sending",
      };
      append(chatId, optimistic);

      // If offline — queue for later
      if (!navigator.onLine) {
        await enqueueAction({
          type: "send_message",
          payload: {
            chatId,
            content: text,
            messageType: type,
            mediaUrl: first?.url,
            replyToId: opts?.replyToId,
          },
        });
        toast.info("Оффлайн: сообщение будет отправлено при подключении");
        return;
      }

      try {
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            content: text || undefined,
            mediaUrl: first?.url,
            fileName: first?.fileName,
            fileSize: first?.fileSize,
            replyToId: opts?.replyToId,
            mentions: opts?.mentions,
            ttlSeconds: opts?.ttlSeconds,
            keyboard: opts?.keyboard,
            scheduledFor: opts?.scheduledFor,
            isViewOnce: opts?.isViewOnce,
            isSilent: opts?.isSilent,
            clientTempId: tempId,
          }),
        });
        if (!res.ok) {
          if (res.status === 429) {
            const errData = (await res.json().catch(() => ({}))) as { retryAfter?: number };
            const wait = errData.retryAfter ?? 10;
            toast.error(`Медленный режим. Подождите ${wait} сек.`);
            upsert(chatId, { ...optimistic, status: "error" });
            return;
          }
          upsert(chatId, { ...optimistic, status: "error" });
          toast.error("Не удалось отправить сообщение");
          return;
        }
        const data = (await res.json()) as { message: MessageDTO };
        replaceByTempId(chatId, tempId, { ...data.message, status: "delivered" });
      } catch {
        // Network error — queue for retry
        await enqueueAction({
          type: "send_message",
          payload: {
            chatId,
            content: text,
            messageType: type,
            mediaUrl: first?.url,
            replyToId: opts?.replyToId,
          },
        });
        toast.info("Соединение потеряно: сообщение будет отправлено позже");
      }
    },
    [append, chatId, myUserId, replaceByTempId],
  );

  // ============================================================
  // Typing
  // ============================================================
  const startTyping = React.useCallback(() => {
    if (!socket || !chatId) return;
    socket.emit("typing:start", chatId);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("typing:stop", chatId);
    }, TYPING_THROTTLE_MS);
  }, [chatId, socket]);

  const stopTyping = React.useCallback(() => {
    if (!socket || !chatId) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = null;
    socket.emit("typing:stop", chatId);
  }, [chatId, socket]);

  const typingUsers = React.useMemo(
    () => Array.from(typingSet ?? []),
    [typingSet],
  );

  return {
    messages,
    isLoading,
    hasMore,
    error,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    togglePin,
    typingUsers,
    startTyping,
    stopTyping,
  };
}
