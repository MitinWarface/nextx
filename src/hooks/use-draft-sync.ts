"use client";

/**
 * useDraftSync — debounce-синхронизация черновиков с сервером.
 * Сохраняет текст в localStorage + POST /api/drafts каждые 2 сек после последнего нажатия.
 */
import * as React from "react";

const DEBOUNCE_MS = 2000;
const STORAGE_PREFIX = "nextx:draft:";

export function useDraftSync(chatId: string | null) {
  const [localDraft, setLocalDraft] = React.useState("");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentChatIdRef = React.useRef(chatId);

  // Загрузка из localStorage при смене чата
  React.useEffect(() => {
    if (!chatId) {
      setLocalDraft("");
      return;
    }
    currentChatIdRef.current = chatId;
    const saved = localStorage.getItem(STORAGE_PREFIX + chatId) ?? "";
    setLocalDraft(saved);
  }, [chatId]);

  // Debounced sync
  const syncDraft = React.useCallback(
    (text: string) => {
      if (!chatId) return;
      localStorage.setItem(STORAGE_PREFIX + chatId, text);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (currentChatIdRef.current !== chatId) return;
        void fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ chatId, content: text }),
        }).catch(() => {});
      }, DEBOUNCE_MS);
    },
    [chatId],
  );

  // Обновление текста
  const updateDraft = React.useCallback(
    (text: string) => {
      setLocalDraft(text);
      syncDraft(text);
    },
    [syncDraft],
  );

  // Очистка
  const clearDraft = React.useCallback(() => {
    if (!chatId) return;
    setLocalDraft("");
    localStorage.removeItem(STORAGE_PREFIX + chatId);
    if (timerRef.current) clearTimeout(timerRef.current);
    void fetch(`/api/drafts?chatId=${chatId}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
  }, [chatId]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { localDraft, updateDraft, clearDraft };
}
