"use client";

import * as React from "react";
import { useSocket } from "./use-socket";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { ChatPreview, MessageDTO } from "@/types";

const STORAGE_KEY = "nextx:notifications";

type Permission = NotificationPermission | "unsupported";

function getInitialEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function getInitialPermission(): Permission {
  if (typeof window === "undefined") return "unsupported";
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

interface UseNotificationsResult {
  enabled: boolean;
  permission: Permission;
  setEnabled: (v: boolean) => void;
  requestPermission: () => Promise<Permission>;
  supported: boolean;
}

export function useNotifications(
  activeChatId: string | null,
): UseNotificationsResult {
  const { socket } = useSocket();
  const myUserId = useAuthStore((s) => s.user?.id);
  const chats = useChatStore((s) => s.chats);

  const [enabled, setEnabledState] = React.useState<boolean>(false);
  const [permission, setPermission] = React.useState<Permission>(
    "default",
  );
  const [supported, setSupported] = React.useState<boolean>(true);

  // Initial hydration
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") {
      setSupported(false);
      setPermission("unsupported");
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);
    setEnabledState(getInitialEnabled());
  }, []);

  // Persist preference
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (enabled) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  }, [enabled]);

  // Re-read permission on visibility change (user may revoke in browser settings)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supported) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setPermission(Notification.permission);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [supported]);

  const setEnabled = React.useCallback(
    (v: boolean) => {
      if (!supported) return;
      if (v && Notification.permission !== "granted") return;
      setEnabledState(v);
    },
    [supported],
  );

  const requestPermission = React.useCallback(async (): Promise<Permission> => {
    if (!supported) return "unsupported";
    if (Notification.permission === "granted") {
      setEnabledState(true);
      return "granted";
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") setEnabledState(true);
    return result;
  }, [supported]);

  // Listen for incoming messages and show notifications
  const chatsRef = React.useRef(chats);
  chatsRef.current = chats;

  React.useEffect(() => {
    if (!socket || !enabled || permission !== "granted") return;

    const onNew = (msg: MessageDTO) => {
      if (msg.senderId === myUserId) return;
      const chat = chatsRef.current[msg.chatId];
      if (!chat) return;
      if (chat.isMuted) return;
      // Если активный чат совпадает и вкладка видна — не нужно
      if (msg.chatId === activeChatId && document.visibilityState === "visible")
        return;

      showNotification(msg, chat);
    };

    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [socket, enabled, permission, myUserId, activeChatId]);

  return { enabled, permission, setEnabled, requestPermission, supported };
}

function showNotification(msg: MessageDTO, chat: ChatPreview) {
  const title = resolveChatTitle(chat);
  const senderName = msg.sender?.displayName ?? "Кто-то";
  const isGroup = chat.type !== "PRIVATE";
  const body = formatBody(msg, senderName, isGroup);

  try {
    const n = new Notification(title, {
      body,
      tag: msg.chatId, // collapse per chat
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
      window.dispatchEvent(
        new CustomEvent("nextx:navigate-chat", {
          detail: { chatId: msg.chatId, messageId: msg.id },
        }),
      );
    };
    // Авто-закрытие через 6 секунд
    setTimeout(() => n.close(), 6000);
  } catch (err) {
    // Браузер без поддержки или блокировка — тихо игнорируем
    console.warn("Notification failed:", err);
  }
}

function resolveChatTitle(chat: ChatPreview): string {
  if (chat.type !== "PRIVATE") return chat.name ?? "Группа";
  // DM: берём displayName собеседника, если есть
  const other = chat.participants.find((p) => p.displayName);
  if (other) return other.displayName;
  return chat.name ?? "Личное сообщение";
}

function formatBody(
  msg: MessageDTO,
  sender: string,
  isGroup: boolean,
): string {
  if (msg.forwardedFrom) {
    const base = `Переслано от ${msg.forwardedFrom.senderName}`;
    if (msg.type === "TEXT" && msg.content) return `${base}: ${msg.content}`;
    return base;
  }
  if (msg.type === "TEXT" && msg.content) {
    if (isGroup) return `${sender}: ${msg.content}`;
    return msg.content;
  }
  const labels: Record<string, string> = {
    IMAGE: "Фото",
    VIDEO: "Видео",
    VOICE: "Голосовое сообщение",
    AUDIO: "Аудио",
    FILE: msg.fileName ?? "Файл",
  };
  return `${sender}: ${labels[msg.type] ?? "Вложение"}`;
}
