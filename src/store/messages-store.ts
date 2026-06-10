import { create } from "zustand";
import type { MessageDTO, ReactionSummary } from "@/types";

interface MessagesState {
  // messagesByChat[chatId] = MessageDTO[] (в порядке createdAt asc)
  messagesByChat: Record<string, MessageDTO[]>;
  // typingByChat[chatId] = Set<userId>
  typingByChat: Record<string, Set<string>>;
  // draftByChat[chatId] = текст в инпуте (опционально, для восстановления)
  draftsByChat: Record<string, string>;

  setAll: (chatId: string, messages: MessageDTO[]) => void;
  append: (chatId: string, message: MessageDTO) => void;
  upsert: (chatId: string, message: MessageDTO) => void;
  remove: (chatId: string, messageId: string) => void;
  replaceByTempId: (chatId: string, tempId: string, message: MessageDTO) => void;
  setReactions: (
    chatId: string,
    messageId: string,
    reactions: ReactionSummary[],
  ) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  setDraft: (chatId: string, draft: string) => void;
  clear: (chatId: string) => void;
  clearAll: () => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  messagesByChat: {},
  typingByChat: {},
  draftsByChat: {},

  setAll: (chatId, messages) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: dedupById(messages),
      },
    })),

  append: (chatId, message) =>
    set((state) => {
      const list = state.messagesByChat[chatId] ?? [];
      // Избегаем дубликатов
      if (list.some((m) => m.id === message.id)) return state;
      // Вставка в порядке createdAt asc
      let idx = list.length;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].createdAt <= message.createdAt) break;
        idx = i;
      }
      const next = [...list];
      next.splice(idx, 0, message);
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: next,
        },
      };
    }),

  upsert: (chatId, message) =>
    set((state) => {
      const list = state.messagesByChat[chatId] ?? [];
      const idx = list.findIndex((m) => m.id === message.id);
      if (idx === -1) {
        // Вставка в порядке createdAt asc
        let insertIdx = list.length;
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].createdAt <= message.createdAt) break;
          insertIdx = i;
        }
        const next = [...list];
        next.splice(insertIdx, 0, message);
        return {
          messagesByChat: {
            ...state.messagesByChat,
            [chatId]: next,
          },
        };
      }
      const next = list.slice();
      next[idx] = { ...list[idx], ...message };
      return { messagesByChat: { ...state.messagesByChat, [chatId]: next } };
    }),

  remove: (chatId, messageId) =>
    set((state) => {
      const list = state.messagesByChat[chatId] ?? [];
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: list.filter((m) => m.id !== messageId),
        },
      };
    }),

  replaceByTempId: (chatId, tempId, message) =>
    set((state) => {
      const list = state.messagesByChat[chatId] ?? [];
      const idx = list.findIndex((m) => m.id === tempId);
      if (idx === -1) {
        const exists = list.some((m) => m.id === message.id);
        if (exists) return state;
        return {
          messagesByChat: {
            ...state.messagesByChat,
            [chatId]: [...list, message],
          },
        };
      }
      const next = list.slice();
      next[idx] = { ...list[idx], ...message };
      return { messagesByChat: { ...state.messagesByChat, [chatId]: next } };
    }),

  setReactions: (chatId, messageId, reactions) =>
    set((state) => {
      const list = state.messagesByChat[chatId];
      if (!list) return state;
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx === -1) return state;
      const next = list.slice();
      next[idx] = { ...next[idx], reactions };
      return { messagesByChat: { ...state.messagesByChat, [chatId]: next } };
    }),

  setTyping: (chatId, userId, isTyping) =>
    set((state) => {
      const prev = state.typingByChat[chatId];
      const set = prev ? new Set(prev) : new Set<string>();
      if (isTyping) {
        if (set.has(userId)) return state;
        set.add(userId);
      } else {
        if (!set.has(userId)) return state;
        set.delete(userId);
      }
      return { typingByChat: { ...state.typingByChat, [chatId]: set } };
    }),

  setDraft: (chatId, draft) =>
    set((state) => ({
      draftsByChat: { ...state.draftsByChat, [chatId]: draft },
    })),

  clear: (chatId) =>
    set((state) => {
      const { [chatId]: _m, ...rest } = state.messagesByChat;
      return { messagesByChat: rest };
    }),

  clearAll: () =>
    set({ messagesByChat: {}, typingByChat: {}, draftsByChat: {} }),
}));

function dedupById(messages: MessageDTO[]): MessageDTO[] {
  const seen = new Set<string>();
  const out: MessageDTO[] = [];
  for (const m of messages) {
    if (!m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}
