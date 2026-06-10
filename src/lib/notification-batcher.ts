/**
 * Smart notification batcher for incoming socket messages.
 * Batches notifications over a 5-second window, groups by chatId,
 * and shows a summary notification.
 */

import type { ChatPreview, MessageDTO } from "@/types";
import { useToastStore } from "@/store/toast-store";

interface PendingNotification {
  chatId: string;
  chatName: string;
  senderName: string;
  count: number;
  latestMessage: MessageDTO;
}

interface BatchWindow {
  timer: ReturnType<typeof setTimeout>;
  notifications: Map<string, PendingNotification>;
  totalMessages: number;
  totalChats: Set<string>;
}

let batchWindow: BatchWindow | null = null;
let isNotificationsEnabled = isSmartNotificationsEnabled();

const BATCH_DELAY_MS = 5_000;
const STORAGE_KEY = "nextx:smart-notifications";

export function isSmartNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(STORAGE_KEY) === "0") return false;
  if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  return true;
}

export function setSmartNotificationsEnabled(v: boolean) {
  isNotificationsEnabled = v;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  }
}

function resolveChatName(chat: ChatPreview): string {
  if (chat.type === "SERVICE") return "NextX";
  if (chat.type === "SELF") return "Избранное";
  if (chat.type !== "PRIVATE") return chat.name ?? "Группа";
  const other = chat.participants.find((p) => p.displayName);
  return other?.displayName ?? chat.name ?? "Личное сообщение";
}

function showBatchedBrowserNotification(batch: BatchWindow) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const entries = Array.from(batch.notifications.values());
  const totalChats = batch.totalChats.size;
  const totalMessages = batch.totalMessages;

  let title: string;
  let body: string;

  if (totalChats === 1 && entries.length === 1) {
    const e = entries[0];
    title = e.chatName;
    body = e.count === 1
      ? `${e.senderName}: ${formatNotificationBody(e.latestMessage)}`
      : `${e.count} сообщений от ${e.senderName}`;
  } else {
    title = `${totalMessages} новых сообщений в ${totalChats} ${chatCountLabel(totalChats)}`;
    const previews = entries.slice(0, 3).map((e) => {
      const name = e.count > 1 ? `${e.chatName} (${e.count})` : e.chatName;
      return name;
    });
    body = previews.join(", ");
    if (entries.length > 3) {
      body += ` и ещё ${entries.length - 3}`;
    }
  }

  try {
    const n = new Notification(title, {
      body,
      tag: `batch-${Date.now()}`,
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
      if (totalChats === 1 && entries.length === 1) {
        window.dispatchEvent(
          new CustomEvent("nextx:navigate-chat", {
            detail: { chatId: entries[0].chatId },
          }),
        );
      }
    };
    setTimeout(() => n.close(), 8000);
  } catch {
    // Notification API blocked
  }
}

function showBatchedToast(batch: BatchWindow) {
  const entries = Array.from(batch.notifications.values());
  const totalChats = batch.totalChats.size;
  const totalMessages = batch.totalMessages;

  if (totalChats === 1 && entries.length === 1) {
    const e = entries[0];
    const msg = e.count === 1
      ? `${e.senderName} в ${e.chatName}: ${formatNotificationBody(e.latestMessage)}`
      : `${e.count} сообщений от ${e.senderName} в ${e.chatName}`;
    useToastStore.getState().show(msg, { variant: "info", duration: 5000 });
  } else {
    const previews = entries.slice(0, 2).map((e) => e.chatName);
    const rest = totalChats > 2 ? ` и ещё ${totalChats - 2} чатов` : "";
    const msg = `${totalMessages} новых сообщений в ${totalChats} ${chatCountLabel(totalChats)}: ${previews.join(", ")}${rest}`;
    useToastStore.getState().show(msg, { variant: "info", duration: 6000 });
  }
}

function formatNotificationBody(msg: MessageDTO): string {
  if (msg.forwardedFrom) {
    return `Переслано от ${msg.forwardedFrom.senderName}`;
  }
  if (msg.type === "TEXT" && msg.content) {
    return msg.content.length > 60 ? msg.content.slice(0, 57) + "…" : msg.content;
  }
  const labels: Record<string, string> = {
    IMAGE: "Фото",
    VIDEO: "Видео",
    VOICE: "Голосовое сообщение",
    AUDIO: "Аудио",
    FILE: msg.fileName ?? "Файл",
    STICKER: "Стикер",
    LOCATION: "Геолокация",
    CONTACT: "Контакт",
  };
  return labels[msg.type] ?? "Вложение";
}

function chatCountLabel(n: number): string {
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 19) return "чатов";
  if (lastDigit === 1) return "чате";
  if (lastDigit >= 2 && lastDigit <= 4) return "чата";
  return "чатах";
}

function flush() {
  if (!batchWindow) return;
  const w = batchWindow;
  batchWindow = null;
  clearTimeout(w.timer);

  if (w.totalMessages === 0) return;

  if (typeof Notification !== "undefined" && Notification.permission === "granted" && isNotificationsEnabled) {
    showBatchedBrowserNotification(w);
  } else {
    showBatchedToast(w);
  }
}

/**
 * Queue a new message notification. Messages are accumulated over
 * BATCH_DELAY_MS and then shown as a single batched notification.
 */
export function queueNotification(
  msg: MessageDTO,
  chat: ChatPreview,
  activeChatId: string | null,
  myUserId: string | undefined,
) {
  if (!isSmartNotificationsEnabled()) return;
  if (msg.senderId === myUserId) return;
  if (chat.isMuted) return;
  if (msg.chatId === activeChatId && typeof document !== "undefined" && document.visibilityState === "visible") return;

  const chatName = resolveChatName(chat);
  const senderName = msg.sender?.displayName ?? "Кто-то";

  if (!batchWindow) {
    batchWindow = {
      timer: setTimeout(flush, BATCH_DELAY_MS),
      notifications: new Map(),
      totalMessages: 0,
      totalChats: new Set(),
    };
  }

  const existing = batchWindow.notifications.get(msg.chatId);
  if (existing) {
    existing.count += 1;
    existing.latestMessage = msg;
  } else {
    batchWindow.notifications.set(msg.chatId, {
      chatId: msg.chatId,
      chatName,
      senderName,
      count: 1,
      latestMessage: msg,
    });
  }

  batchWindow.totalMessages += 1;
  batchWindow.totalChats.add(msg.chatId);
}
