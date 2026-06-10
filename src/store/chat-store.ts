import { create } from "zustand";
import type { ChatPreview } from "@/types";

interface ChatStoreState {
  chats: Record<string, ChatPreview>;
  order: string[]; // отсортированы по lastMessageAt desc
  isLoading: boolean;

  setAll: (chats: ChatPreview[]) => void;
  upsert: (chat: ChatPreview) => void;
  remove: (chatId: string) => void;
  setLoading: (loading: boolean) => void;
  resetUnread: (chatId: string) => void;
  handleIncomingMessage: (chatId: string, senderId: string, content: string, createdAt: string, myUserId?: string) => void;
  clear: () => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  chats: {},
  order: [],
  isLoading: false,

  setAll: (chats) =>
    set(() => {
      const map: Record<string, ChatPreview> = {};
      const sorted = [...chats].sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime(),
      );
      for (const c of sorted) map[c.id] = c;
      return { chats: map, order: sorted.map((c) => c.id) };
    }),

  upsert: (chat) =>
    set((state) => {
      const next = { ...state.chats, [chat.id]: chat };
      const order = [
        chat.id,
        ...state.order.filter((id) => id !== chat.id),
      ].sort(
        (a, b) =>
          new Date(next[b].lastMessageAt).getTime() -
          new Date(next[a].lastMessageAt).getTime(),
      );
      return { chats: next, order };
    }),

  remove: (chatId) =>
    set((state) => {
      const { [chatId]: _removed, ...rest } = state.chats;
      return { chats: rest, order: state.order.filter((id) => id !== chatId) };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  resetUnread: (chatId) =>
    set((state) => {
      const chat = state.chats[chatId];
      if (!chat) return state;
      return {
        chats: { ...state.chats, [chatId]: { ...chat, unreadCount: 0 } },
      };
    }),

  handleIncomingMessage: (chatId, senderId, content, createdAt, myUserId) =>
    set((state) => {
      const chat = state.chats[chatId];
      if (!chat) return state;
      const isOwn = senderId === myUserId;
      const nextChat: ChatPreview = {
        ...chat,
        lastMessage: {
          ...chat.lastMessage,
          content,
          senderId,
          createdAt,
        } as any,
        lastMessageAt: createdAt,
        unreadCount: isOwn ? chat.unreadCount : chat.unreadCount + 1,
      };
      const nextChats = { ...state.chats, [chatId]: nextChat };
      const order = [
        chatId,
        ...state.order.filter((id) => id !== chatId),
      ].sort(
        (a, b) =>
          new Date(nextChats[b].lastMessageAt).getTime() -
          new Date(nextChats[a].lastMessageAt).getTime(),
      );
      return { chats: nextChats, order };
    }),

  clear: () => set({ chats: {}, order: [], isLoading: false }),
}));
