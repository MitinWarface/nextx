"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSocket } from "@/hooks/use-socket";
import { useChatStore } from "@/store/chat-store";
import { useAuthStore } from "@/store/auth-store";
import { ChatList, type ChatListItemData } from "@/components/chat/chat-list";
import { MainMenu } from "@/components/chat/main-menu";
import { SettingsModal } from "@/components/chat/settings-modal";
import { ContactsModal } from "@/components/chat/contacts-modal";
import { WalletModal } from "@/components/chat/wallet-modal";
import { GiftModal } from "@/components/chat/gift-modal";
import { PremiumModal } from "@/components/chat/premium-modal";
import { MyGiftsModal } from "@/components/chat/my-gifts-modal";
import { AlbumsModal } from "@/components/albums/albums-modal";
import { MyPaymentsModal } from "@/components/chat/my-payments-modal";
import { TrashModal } from "@/components/chat/trash-modal";
import { ProfileShopModal } from "@/components/chat/profile-shop-modal";
import { SupportForm } from "@/components/chat/support-form";
import { ChatTopBar } from "@/components/chat/chat-topbar";
import { ChatSearchBar } from "@/components/chat/chat-search-bar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { ProfilePanel } from "@/components/chat/profile-panel";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ScrollToBottomButton } from "@/components/chat/scroll-to-bottom-button";
import { MusicPlayer } from "@/components/music/music-player";
import { ForwardModal } from "@/components/chat/forward-modal";
import { ReportDialog } from "@/components/chat/report-dialog";
import { ProfileEditModal } from "@/components/chat/profile-edit-modal";
import { CreateChatModal } from "@/components/chat/create-chat-modal";
import { GlobalSearchModal } from "@/components/chat/global-search-modal";
import { PinnedMessagesBar } from "@/components/chat/pinned-messages-bar";
import { ChatListSkeleton, EmptyState } from "@/components/chat/skeletons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, X, Share2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoryComposer } from "@/components/chat/story-composer";
import { StoryViewer } from "@/components/chat/story-viewer";
import { RecentFilesModal } from "@/components/files/recent-files-modal";
import { CollectionsModal } from "@/components/chat/collections-modal";
import { SaveToCollectionModal } from "@/components/chat/save-to-collection-modal";
import { ScheduledQueueModal } from "@/components/chat/scheduled-queue-modal";
import { BookmarksModal } from "@/components/bookmarks/bookmarks-modal";
import { CallProvider, useCallContext } from "@/components/chat/call-provider";
import { OutgoingCallModal, IncomingCallModal } from "@/components/chat/call-modal";
import { IncomingCallToast } from "@/components/chat/incoming-call-listener";
import { GroupCallModal } from "@/components/chat/group-call-modal";
import { VoiceChannelPanel } from "@/components/chat/voice-channel-panel";
import { MessageRequestBanner } from "@/components/chat/message-request-banner";
import { useCallStore } from "@/store/call-store";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useNotifications } from "@/hooks/use-notifications";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { queueNotification } from "@/lib/notification-batcher";
import { toast } from "@/store/toast-store";
import type { ChatPreview, MessageDTO, ReplyPreview } from "@/types";

const SCROLL_BOTTOM_THRESHOLD = 80;

function toChatListItem(
  c: ChatPreview,
  myUserId: string | undefined,
): ChatListItemData {
  const isPrivate = c.type === "PRIVATE";
  const isService = c.type === "SERVICE";
  const isSelf = c.type === "SELF";
  const other = c.participants.find((p) => p.id !== (myUserId ?? ""));

  let name: string;
  let avatarUrl: string | null;

  if (isService) {
    name = "NextX";
    avatarUrl = "/favicon.svg";
  } else if (isSelf) {
    name = "Избранное";
    avatarUrl = "/favicon.svg";
  } else if (isPrivate) {
    name = other?.displayName ?? c.name ?? "Unknown";
    avatarUrl = other?.avatarUrl ?? c.avatarUrl;
  } else {
    name = c.name ?? "Group";
    avatarUrl = c.avatarUrl;
  }

  return {
    id: c.id,
    name,
    avatarUrl,
    type: c.type,
    lastMessage: c.lastMessage
      ? {
          content: c.lastMessage.content,
          senderName: c.lastMessage.sender?.displayName ?? null,
          createdAt: new Date(c.lastMessage.createdAt).getTime(),
        }
      : null,
    unreadCount: c.unreadCount,
    isMuted: c.isMuted,
    isVerified: isService,
    isPinned: c.isPinned,
    isArchived: c.isArchived ?? false,
    isOnline: isPrivate ? other?.status === "ONLINE" : false,
    memberCount: c.type !== "PRIVATE" ? c.participants.length : undefined,
    isPremium: isPrivate ? other?.premiumStatus === "active" : false,
    chatPinHash: c.chatPinHash ?? null,
    colorLabel: c.colorLabel ?? null,
  };
}

export default function MainPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const userFeatures = useAuthStore((s) => s.user?.features);
  const myFeatures = userFeatures ?? [];
  const { socket } = useSocket();
  const chatsMap = useChatStore((s) => s.chats);
  const chatsOrder = useChatStore((s) => s.order);
  const chatsLoading = useChatStore((s) => s.isLoading);
  const setAllChats = useChatStore((s) => s.setAll);
  const setChatsLoading = useChatStore((s) => s.setLoading);
  const handleIncomingMessage = useChatStore((s) => s.handleIncomingMessage);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [targetMessageId, setTargetMessageId] = React.useState<string | null>(null);
  const [pendingLockChatId, setPendingLockChatId] = React.useState<string | null>(null);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [groupCallOpen, setGroupCallOpen] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<ReplyPreview | null>(null);
  const [atBottom, setAtBottom] = React.useState(true);
  const [unseenCount, setUnseenCount] = React.useState(0);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchIndex, setSearchIndex] = React.useState(0);
  const [searchFilter, setSearchFilter] = React.useState<{
    kind: "all" | "text" | "media" | "files" | "links";
    senderId: string | null;
  }>({ kind: "all", senderId: null });
  const [forwardMessage, setForwardMessage] = React.useState<MessageDTO | null>(
    null,
  );
  const [reportMessage, setReportMessage] = React.useState<{ messageId: string; senderId: string } | null>(null);
  const [profileEditOpen, setProfileEditOpen] = React.useState(false);
  const [createChatOpen, setCreateChatOpen] = React.useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = React.useState(false);
  const [mainMenuOpen, setMainMenuOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [contactsOpen, setContactsOpen] = React.useState(false);
  const [walletOpen, setWalletOpen] = React.useState(false);
  const [premiumOpen, setPremiumOpen] = React.useState(false);
  const [myGiftsOpen, setMyGiftsOpen] = React.useState(false);
  const [myPaymentsOpen, setMyPaymentsOpen] = React.useState(false);
  const [trashOpen, setTrashOpen] = React.useState(false);
  const [shopOpen, setShopOpen] = React.useState(false);
  const [supportOpen, setSupportOpen] = React.useState(false);
  const [albumsOpen, setAlbumsOpen] = React.useState(false);
  const [recentFilesOpen, setRecentFilesOpen] = React.useState(false);
  const [collectionsOpen, setCollectionsOpen] = React.useState(false);
  const [saveToCollectionOpen, setSaveToCollectionOpen] = React.useState(false);
  const [saveToCollectionMessage, setSaveToCollectionMessage] = React.useState<{ id: string; chatId: string } | null>(null);
  const [scheduledQueueOpen, setScheduledQueueOpen] = React.useState(false);
  const [bookmarksOpen, setBookmarksOpen] = React.useState(false);
  const [giftTarget, setGiftTarget] = React.useState<{ id: string; name: string; avatar?: string | null } | null>(null);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [bulkSelected, setBulkSelected] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [jumpToMessageId, setJumpToMessageId] = React.useState<string | null>(null);
  const [unlockedChats, setUnlockedChats] = React.useState<Set<string>>(new Set());
  const [stories, setStories] = React.useState<
    Array<{
      id: string;
      authorId: string;
      author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
      mediaUrl: string;
      mediaType: "IMAGE" | "VIDEO";
      caption: string | null;
      createdAt: string;
      expiresAt: string;
      viewCount: number;
      viewedByMe: boolean;
      highlightName: string | null;
    }>
  >([]);
  const [storiesLoading, setStoriesLoading] = React.useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);
  const [storyComposerOpen, setStoryComposerOpen] = React.useState(false);
  const [storyViewerGroup, setStoryViewerGroup] = React.useState<
    | {
        author: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
        };
        stories: typeof stories;
        allViewed: boolean;
      }
    | null
  >(null);

  // === Chat Folders ===
  const [folders, setFolders] = React.useState<
    Array<{ id: string; name: string; icon: string; chatIds: string[] }>
  >([]);
  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(null);
  const [folderChatIds, setFolderChatIds] = React.useState<Record<string, string[]>>({});

  // === Message Requests ===
  const [messageRequest, setMessageRequest] = React.useState<{
    senderId: string;
    senderName: string;
    senderUsername: string;
    senderAvatarUrl: string | null;
  } | null>(null);

  const loadFolders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/folders", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        folders: Array<{ id: string; name: string; icon: string; chatIds: string[] }>;
      };
      setFolders(data.folders);
      const map: Record<string, string[]> = {};
      for (const f of data.folders) map[f.id] = f.chatIds;
      setFolderChatIds(map);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (user) void loadFolders();
  }, [user, loadFolders]);

  const handleCreateFolder = React.useCallback(async (name: string, chatTypes: string[]) => {
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), chatTypes }),
      });
      if (res.ok) loadFolders();
    } catch {
      // ignore
    }
  }, [loadFolders]);

  const handleDeleteFolder = React.useCallback(
    async (folderId: string) => {
      if (!confirm("Удалить папку?")) return;
      try {
        await fetch(`/api/folders/${folderId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (activeFolderId === folderId) setActiveFolderId(null);
        loadFolders();
      } catch {
        // ignore
      }
    },
    [activeFolderId, loadFolders],
  );

  const loadStories = React.useCallback(async () => {
    setStoriesLoading(true);
    try {
      const res = await fetch("/api/stories", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { stories: typeof stories };
      setStories(data.stories);
    } catch {
      // ignore
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;
    void loadStories();
    const t = setInterval(() => void loadStories(), 60_000);
    return () => clearInterval(t);
  }, [user, loadStories]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const atBottomRef = React.useRef(true);
  const prevMsgCountRef = React.useRef(0);
  const messageRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingScrollToRef = React.useRef<string | null>(null);
  const scrollAttemptsRef = React.useRef(0);
  const FLASH_TIMEOUT_MS = 1600;
  const MAX_SCROLL_ATTEMPTS = 10;

  // Сбрасываем выбранный reply при смене чата
  React.useEffect(() => {
    setReplyTo(null);
  }, [activeId]);

  // Check if newly selected chat requires PIN unlock
  React.useEffect(() => {
    if (!activeId) { setPendingLockChatId(null); return; }
    const chat = chatsMap[activeId];
    if (chat?.chatPinHash && !unlockedChats.has(activeId)) {
      setPendingLockChatId(activeId);
    } else {
      setPendingLockChatId(null);
    }
  }, [activeId, chatsMap, unlockedChats]);

  // Сбрасываем scroll-state при смене чата
  React.useEffect(() => {
    setAtBottom(true);
    atBottomRef.current = true;
    setUnseenCount(0);
    prevMsgCountRef.current = 0;
  }, [activeId]);

  // ============================================================
  // Загрузка списка чатов
  // ============================================================
  React.useEffect(() => {
    if (!user) return;
    setChatsLoading(true);
    void fetch("/api/chats", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { chats: ChatPreview[] }) => {
        setAllChats(data.chats);
      })
      .finally(() => setChatsLoading(false));
  }, [setAllChats, setChatsLoading, user]);

  // ============================================================
  // Deep-link: ?chat=chatId&msg=messageId — auto-select chat + scroll
  // ============================================================
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const chatParam = params.get("chat");
    const msgParam = params.get("msg");
    if (chatParam) {
      setActiveId(chatParam);
      if (msgParam) setTargetMessageId(msgParam);
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ============================================================
  // Сообщения активного чата (hook с socket + optimistic UI)
  // ============================================================
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    togglePin,
    startTyping,
    stopTyping,
    typingUsers,
    loadMore: loadMoreRaw,
    hasMore,
  } = useChatMessages({ chatId: activeId });

  // Обёртка: сохраняем scroll-позицию, если loadMore допрепендил сообщения,
  // а пользователь не у дна.
  const loadMore = React.useCallback(async () => {
    const el = scrollRef.current;
    if (!el) {
      await loadMoreRaw();
      return;
    }
    const wasAtBottom = atBottomRef.current;
    const oldHeight = el.scrollHeight;
    const oldTop = el.scrollTop;
    await loadMoreRaw();
    // Дожидаемся рендера: обычно хватает двух rAF
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el2 = scrollRef.current;
        if (!el2) return;
        const newHeight = el2.scrollHeight;
        const delta = newHeight - oldHeight;
        if (delta > 0 && !wasAtBottom) {
          el2.scrollTop = oldTop + delta;
        }
      });
    });
  }, [loadMoreRaw]);

  // Scroll to target message after messages load (deep-link)
  React.useEffect(() => {
    if (!targetMessageId || messages.length === 0) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-msg-id="${targetMessageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary/60", "rounded-md");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary/60", "rounded-md");
        }, 3000);
      }
      setTargetMessageId(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [targetMessageId, messages]);

  // ============================================================
  // Браузерные уведомления (in-page Notification API)
  // ============================================================
  const notifications = useNotifications(activeId);

  // Smart notification batching: queue incoming messages for batched notification
  const chatsMapRef = React.useRef(chatsMap);
  chatsMapRef.current = chatsMap;
  const handleIncomingRef = React.useRef(handleIncomingMessage);
  handleIncomingRef.current = handleIncomingMessage;
  const activeIdRef = React.useRef(activeId);
  activeIdRef.current = activeId;
  const userIdRef = React.useRef(user?.id);
  userIdRef.current = user?.id;

  React.useEffect(() => {
    if (!socket) return;
    const onNew = (msg: MessageDTO) => {
      const chat = chatsMapRef.current[msg.chatId];
      if (chat) {
        queueNotification(msg, chat, activeIdRef.current, userIdRef.current);
      }
      // Update sidebar: unread count + lastMessage + resort order
      if (msg.chatId && msg.senderId) {
        handleIncomingRef.current(
          msg.chatId,
          msg.senderId,
          msg.content ?? "",
          msg.createdAt,
          userIdRef.current,
        );
      }
    };
    socket.on("message:new", onNew);
    return () => { socket.off("message:new", onNew); };
  }, [socket]);

  // Offline queue: retry queued actions on reconnect
  const { isOnline, queueSize } = useOfflineQueue();

  // Обработка клика по системному уведомлению: переход в чат
  React.useEffect(() => {
    const onNavigate = (e: Event) => {
      const ce = e as CustomEvent<{ chatId: string }>;
      if (ce.detail?.chatId) {
        setActiveId(ce.detail.chatId);
      }
    };
    window.addEventListener("nextx:navigate-chat", onNavigate as EventListener);
    return () => {
      window.removeEventListener(
        "nextx:navigate-chat",
        onNavigate as EventListener,
      );
    };
  }, []);

  // Защита от дублей в сторе — дедуп по id, порядок сохраняем
  const dedupedMessages = React.useMemo(() => {
    const seen = new Set<string>();
    const out: typeof messages = [];
    for (const m of messages) {
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
    return out;
  }, [messages]);

  // ============================================================
  // Виртуализация v2: окно из VISIBLE_WINDOW сообщений, центрированное на
  // ближайшем к видимой области. Плюс content-visibility:auto на бабблах —
  // браузер сам не рендерит внеэкранные. Догрузка старых сообщений — через
  // sentinel сверху, отслеживаемый IntersectionObserver.
  // ============================================================
  const VISIBLE_WINDOW = 500;
  const [virtualRange, setVirtualRange] = React.useState<{
    start: number;
    end: number;
  } | null>(null);

  const visibleMessages = React.useMemo(() => {
    if (dedupedMessages.length <= VISIBLE_WINDOW) return dedupedMessages;
    if (!virtualRange) {
      return dedupedMessages.slice(-VISIBLE_WINDOW);
    }
    const { start, end } = virtualRange;
    return dedupedMessages.slice(start, end);
  }, [dedupedMessages, virtualRange]);

  // Сброс окна при смене чата
  React.useEffect(() => {
    setVirtualRange(null);
  }, [activeId]);

  // Обновление окна по видимым сообщениям (IntersectionObserver)
  const updateRange = React.useCallback(() => {
    const total = dedupedMessages.length;
    if (total === 0) return;
    const els = messageRefs.current;
    if (els.size === 0) return;
    const viewport = scrollRef.current;
    if (!viewport) return;
    const vtop = viewport.scrollTop;
    const vbot = vtop + viewport.clientHeight;

    let firstVisible = -1;
    let lastVisible = -1;
    for (const m of dedupedMessages) {
      const el = els.get(m.id);
      if (!el) continue;
      const top = el.offsetTop;
      const bot = top + el.offsetHeight;
      if (bot < vtop || top > vbot) continue;
      const idx = dedupedMessages.findIndex((x) => x.id === m.id);
      if (idx === -1) continue;
      if (firstVisible === -1) firstVisible = idx;
      lastVisible = idx;
    }
    if (firstVisible === -1) {
      // ничего не видно — показываем последние
      firstVisible = Math.max(0, total - VISIBLE_WINDOW);
      lastVisible = total - 1;
    }
    const padding = 150;
    const newStart = Math.max(0, firstVisible - padding);
    const newEnd = Math.min(total, lastVisible + padding + 1);
    setVirtualRange((prev) => {
      if (!prev) return { start: newStart, end: newEnd };
      if (prev.start === newStart && prev.end === newEnd) return prev;
      return { start: newStart, end: newEnd };
    });
  }, [dedupedMessages]);

  // Запускаем пересчёт после каждого рендера
  React.useEffect(() => {
    if (visibleMessages.length === 0) return;
    const id = requestAnimationFrame(() => updateRange());
    return () => cancelAnimationFrame(id);
  }, [visibleMessages.length, updateRange]);

  // Sentinel для догрузки старых сообщений
  const loadMoreSentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && hasMore) {
            void loadMore();
          }
        }
      },
      { root, rootMargin: "200px 0px 0px 0px" },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  // ============================================================
  // Поиск по чату с фильтрами
  // ============================================================
  const searchMatches = React.useMemo(() => {
    if (!searchOpen) return [] as MessageDTO[];
    const q = searchQuery.trim().toLowerCase();
    if (!q && searchFilter.kind === "all" && !searchFilter.senderId) {
      return [] as MessageDTO[];
    }
    return dedupedMessages.filter((m) => {
      // sender filter
      if (searchFilter.senderId && m.senderId !== searchFilter.senderId) {
        return false;
      }
      // kind filter
      switch (searchFilter.kind) {
        case "text":
          if (m.type !== "TEXT") return false;
          break;
        case "media":
          if (m.type !== "IMAGE" && m.type !== "VIDEO" && m.type !== "STICKER") {
            return false;
          }
          break;
        case "files":
          if (
            m.type !== "FILE" &&
            m.type !== "AUDIO" &&
            m.type !== "VOICE"
          ) {
            return false;
          }
          break;
        case "links":
          if (!m.content) return false;
          if (!/(https?:\/\/|www\.)/i.test(m.content)) return false;
          break;
        case "all":
        default:
          break;
      }
      // query
      if (q) {
        if (m.type !== "TEXT" && m.type !== "SYSTEM") {
          // для media/files ищем по имени файла
          if (!m.fileName?.toLowerCase().includes(q)) return false;
        } else if (!m.content || !m.content.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [dedupedMessages, searchOpen, searchQuery, searchFilter]);

  // ============================================================
  // Закреплённые сообщения
  // ============================================================
  const pinnedMessages = React.useMemo(() => {
    return visibleMessages
      .filter((m) => m.isPinned)
      .sort((a, b) => {
        const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [visibleMessages]);

  // ============================================================
  // Медиа-группы (consecutive IMAGE from same sender within 5 min)
  // ============================================================
  const mediaGroupMap = React.useMemo(() => {
    const MS = 5 * 60 * 1000;
    const map = new Map<
      string,
      { images: { url: string; fileName?: string }[]; startIndex: number }
    >();

    // Pass 1: group by explicit albumId (user sent multiple files at once)
    const albumMap = new Map<string, typeof visibleMessages>();
    for (const m of visibleMessages) {
      if (m.albumId && m.mediaUrl && (m.type === "IMAGE" || m.type === "VIDEO")) {
        const arr = albumMap.get(m.albumId) || [];
        arr.push(m);
        albumMap.set(m.albumId, arr);
      }
    }
    for (const [, msgs] of albumMap) {
      if (msgs.length < 2) continue;
      const images = msgs.map((x) => ({
        url: x.mediaUrl as string,
        fileName: x.fileName ?? undefined,
      }));
      for (let i = 0; i < msgs.length; i++) {
        map.set(msgs[i].id, { images, startIndex: i });
      }
    }

    // Pass 2: client-side grouping by time+sender (for messages without albumId)
    let groupStart = 0;
    while (groupStart < visibleMessages.length) {
      const m = visibleMessages[groupStart];
      if (m.type !== "IMAGE" || !m.mediaUrl || m.albumId || map.has(m.id)) {
        groupStart++;
        continue;
      }
      let groupEnd = groupStart + 1;
      while (groupEnd < visibleMessages.length) {
        const n = visibleMessages[groupEnd];
        if (
          n.type !== "IMAGE" ||
          !n.mediaUrl ||
          n.albumId ||
          map.has(n.id) ||
          n.senderId !== m.senderId
        )
          break;
        const a = new Date(m.createdAt).getTime();
        const b = new Date(n.createdAt).getTime();
        if (Math.abs(b - a) > MS) break;
        groupEnd++;
      }
      const count = groupEnd - groupStart;
      if (count > 1) {
        const images = visibleMessages
          .slice(groupStart, groupEnd)
          .map((x) => ({
            url: x.mediaUrl as string,
            fileName: x.fileName ?? undefined,
          }));
        for (let i = 0; i < count; i++) {
          map.set(visibleMessages[groupStart + i].id, {
            images,
            startIndex: i,
          });
        }
      }
      groupStart = groupEnd;
    }
    return map;
  }, [visibleMessages]);

  const currentSearchMatchId = searchMatches[searchIndex]?.id ?? null;

  // Сбрасываем индекс при изменении запроса
  React.useEffect(() => {
    setSearchIndex(0);
  }, [searchQuery]);

  // Следим за выходом индекса за пределы (после удаления/редактирования)
  React.useEffect(() => {
    if (searchIndex >= searchMatches.length && searchMatches.length > 0) {
      setSearchIndex(searchMatches.length - 1);
    } else if (searchMatches.length === 0 && searchIndex !== 0) {
      setSearchIndex(0);
    }
  }, [searchMatches.length, searchIndex]);

  // Скроллим к текущему совпадению при изменении индекса
  React.useEffect(() => {
    if (!searchOpen || !currentSearchMatchId) return;
    const el = messageRefs.current.get(currentSearchMatchId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("message-flash");
    void el.offsetWidth;
    el.classList.add("message-flash");
    setTimeout(() => el.classList.remove("message-flash"), FLASH_TIMEOUT_MS);
  }, [searchOpen, currentSearchMatchId]);

  const openSearch = React.useCallback(() => {
    setSearchOpen(true);
    setSearchQuery("");
    setSearchIndex(0);
    setSearchFilter({ kind: "all", senderId: null });
  }, []);

  const closeSearch = React.useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchIndex(0);
    setSearchFilter({ kind: "all", senderId: null });
  }, []);

  const goPrevMatch = React.useCallback(() => {
    if (searchMatches.length === 0) return;
    setSearchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length);
  }, [searchMatches.length]);

  const goNextMatch = React.useCallback(() => {
    if (searchMatches.length === 0) return;
    setSearchIndex((i) => (i + 1) % searchMatches.length);
  }, [searchMatches.length]);

  // Закрываем поиск при смене чата
  React.useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchIndex(0);
  }, [activeId]);

  // Scroll-handler: определяем, у дна ли пользователь
  const scrollRafRef = React.useRef<number | null>(null);
  const handleScroll = React.useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      const isBottom = dist < SCROLL_BOTTOM_THRESHOLD;
      atBottomRef.current = isBottom;
      setAtBottom(isBottom);
      if (isBottom) setUnseenCount(0);
    });
  }, []);

  // Следим за новыми сообщениями: считаем по dedupedMessages, чтобы виртуализация
  // не ломала подсчёт. Считаем «непрочитанные» только если новое сообщение не
  // попало в текущее окно.
  React.useEffect(() => {
    const total = dedupedMessages.length;
    const prev = prevMsgCountRef.current;
    if (prev === 0) {
      prevMsgCountRef.current = total;
      return;
    }
    if (total > prev) {
      const visibleIds = new Set(visibleMessages.map((m) => m.id));
      const newOnes = dedupedMessages.slice(prev);
      const fromOthersNotVisible = newOnes.filter(
        (m) => m.senderId !== user?.id && !visibleIds.has(m.id),
      ).length;
      if (fromOthersNotVisible > 0) {
        setUnseenCount((c) => c + fromOthersNotVisible);
      }
      // Если у дна — прокручиваем
      if (atBottomRef.current) {
        requestAnimationFrame(() => {
          const el = scrollRef.current;
          if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        });
      }
    }
    prevMsgCountRef.current = total;
  }, [dedupedMessages, visibleMessages, user?.id]);

  // После смены чата / начальной загрузки — сразу прокрутить вниз
  React.useEffect(() => {
    if (!activeId) return;
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [activeId, visibleMessages.length === 0]);

  // ============================================================
  // Создание чата: private / group
  // ============================================================
  const refreshChats = React.useCallback(async () => {
    try {
      const r = await fetch("/api/chats", { credentials: "include" });
      if (!r.ok) return;
      const data = (await r.json()) as { chats: ChatPreview[] };
      setAllChats(data.chats);
    } catch {
      // ignore
    }
  }, [setAllChats]);

  const handleCreatePrivate = React.useCallback(
    async (otherUserId: string) => {
      const res = await fetch("/api/chats", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "PRIVATE", otherUserId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(err?.error ?? `create_failed_${res.status}`);
      }
      const data = (await res.json()) as { chat: ChatPreview };
      await refreshChats();
      setActiveId(data.chat.id);
    },
    [refreshChats],
  );

  const handleCreateGroup = React.useCallback(
    async (name: string, memberIds: string[], description?: string) => {
      const res = await fetch("/api/chats", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "GROUP", name, memberIds, description }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(err?.error ?? `create_failed_${res.status}`);
      }
      const data = (await res.json()) as { chat: ChatPreview };
      await refreshChats();
      setActiveId(data.chat.id);
    },
    [refreshChats],
  );

  const handleCreateChannel = React.useCallback(
    async (name: string, memberIds: string[], description?: string, isPrivate?: boolean, maxSubscribers?: number) => {
      const res = await fetch("/api/chats", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CHANNEL", name, memberIds, description, isPrivate, maxSubscribers }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(err?.error ?? `create_failed_${res.status}`);
      }
      const data = (await res.json()) as { chat: ChatPreview };
      await refreshChats();
      setActiveId(data.chat.id);
    },
    [refreshChats],
  );

  // ============================================================
  // Bulk select
  // ============================================================
  const exitBulkMode = React.useCallback(() => {
    setBulkMode(false);
    setBulkSelected(new Set());
  }, []);

  const handleBulkToggle = React.useCallback((messageId: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const handleBulkDelete = React.useCallback(async () => {
    if (bulkSelected.size === 0) return;
    if (!confirm(`Удалить ${bulkSelected.size} сообщений?`)) return;
    const res = await fetch("/api/messages/bulk-delete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: Array.from(bulkSelected) }),
    });
    if (res.ok) {
      exitBulkMode();
    } else {
      alert("Не удалось удалить сообщения");
    }
  }, [bulkSelected, exitBulkMode]);

  const handleBulkForward = React.useCallback(() => {
    if (bulkSelected.size === 0) return;
    // Простое решение: пересылаем по одному через текущий handleForward
    // Для удобства возьмём первое выбранное сообщение и откроем ForwardModal
    // (Telegram-like: bulk forward — отправка по одному в выбранный чат)
    const first = messages.find((m) => bulkSelected.has(m.id));
    if (first) {
      setForwardMessage(first);
    }
    exitBulkMode();
  }, [bulkSelected, messages, exitBulkMode]);

  // ============================================================
  // Forward: отправка в другой чат
  // ============================================================
  const handleForward = React.useCallback(
    async (targetChatId: string, hideAuthor?: boolean) => {
      if (!forwardMessage) return;
      const payload: Record<string, unknown> = {
        type: forwardMessage.type,
        forwardedFromId: forwardMessage.id,
        clientTempId: `fwd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      if (forwardMessage.content) payload.content = forwardMessage.content;
      if (forwardMessage.mediaUrl) payload.mediaUrl = forwardMessage.mediaUrl;
      if (forwardMessage.thumbnailUrl)
        payload.thumbnailUrl = forwardMessage.thumbnailUrl;
      if (forwardMessage.fileName) payload.fileName = forwardMessage.fileName;
      if (forwardMessage.fileSize != null)
        payload.fileSize = forwardMessage.fileSize;
      if ((forwardMessage as any).isStealth) payload.isStealth = true;
      if (hideAuthor) payload.hideAuthor = true;
      const res = await fetch(`/api/chats/${targetChatId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(err?.error ?? `forward_failed_${res.status}`);
      }
      // Обновляем список чатов, чтобы получатель всплыл наверх
      try {
        const r = await fetch("/api/chats", { credentials: "include" });
        if (r.ok) {
          const data = (await r.json()) as { chats: ChatPreview[] };
          setAllChats(data.chats);
        }
      } catch {
        // не критично
      }
    },
    [forwardMessage, setAllChats],
  );

  const closeForward = React.useCallback(() => {
    setForwardMessage(null);
  }, []);

  const handleSaveMessage = React.useCallback(
    async (msg: MessageDTO) => {
      try {
        // Получаем/создаём чат "Избранное"
        const sRes = await fetch("/api/chats/saved", { credentials: "include" });
        if (!sRes.ok) throw new Error("saved_chat_failed");
        const { chatId: savedChatId } = (await sRes.json()) as { chatId: string };
        // Копируем сообщение в savedChat с forwardedFromId
        const payload: Record<string, unknown> = {
          type: msg.type,
          forwardedFromId: msg.id,
          clientTempId: `save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
        if (msg.content) payload.content = msg.content;
        if (msg.mediaUrl) payload.mediaUrl = msg.mediaUrl;
        if (msg.thumbnailUrl) payload.thumbnailUrl = msg.thumbnailUrl;
        if (msg.fileName) payload.fileName = msg.fileName;
        if (msg.fileSize != null) payload.fileSize = msg.fileSize;
        const res = await fetch(`/api/chats/${savedChatId}/messages`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("save_failed");
        // Тост
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useToastStore } = await import("@/store/toast-store");
        useToastStore.getState().show("Сохранено в Избранное", { variant: "success" });
        // Обновим список чатов, чтобы Избранное всплыло
        try {
          const r = await fetch("/api/chats", { credentials: "include" });
          if (r.ok) {
            const data = (await r.json()) as { chats: ChatPreview[] };
            setAllChats(data.chats);
          }
        } catch {
          // не критично
        }
      } catch {
        const { useToastStore } = await import("@/store/toast-store");
        useToastStore.getState().show("Не удалось сохранить", { variant: "error", duration: 5000 });
      }
    },
    [setAllChats],
  );

  const handleSaveToCollection = React.useCallback(
    (msg: MessageDTO) => {
      setSaveToCollectionMessage({ id: msg.id, chatId: msg.chatId });
      setSaveToCollectionOpen(true);
    },
    [],
  );

  // ============================================================
  // Reply-jump: клик по цитате → скролл + подсветка целевого сообщения
  // ============================================================
  const tryScrollToMessage = React.useCallback((id: string): boolean => {
    const el = messageRefs.current.get(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("message-flash");
    // reflow, чтобы анимация перезапустилась
    void el.offsetWidth;
    el.classList.add("message-flash");
    setTimeout(() => el.classList.remove("message-flash"), FLASH_TIMEOUT_MS);
    return true;
  }, []);

  const handleReplyClick = React.useCallback(
    (id: string) => {
      pendingScrollToRef.current = id;
      scrollAttemptsRef.current = 0;
      if (tryScrollToMessage(id)) {
        pendingScrollToRef.current = null;
      } else {
        void loadMore();
      }
    },
    [loadMore, tryScrollToMessage],
  );

  // Scroll to jumpToMessageId (jump-to-date)
  React.useEffect(() => {
    if (!jumpToMessageId || messages.length === 0) return;
    pendingScrollToRef.current = jumpToMessageId;
    scrollAttemptsRef.current = 0;
    if (tryScrollToMessage(jumpToMessageId)) {
      pendingScrollToRef.current = null;
      setJumpToMessageId(null);
    } else {
      void loadMore();
    }
  }, [jumpToMessageId, messages, tryScrollToMessage, loadMore]);

  const handleGlobalSearchSelect = React.useCallback(
    (chatId: string, messageId: string) => {
      setActiveId(chatId);
      // Дать React отрендерить чат + подгрузить сообщения
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          handleReplyClick(messageId);
        });
      });
    },
    [handleReplyClick],
  );

  // Когда подгружаются новые сообщения, повторяем попытку
  React.useEffect(() => {
    const id = pendingScrollToRef.current;
    if (!id) return;
    if (tryScrollToMessage(id)) {
      pendingScrollToRef.current = null;
      return;
    }
    scrollAttemptsRef.current += 1;
    if (scrollAttemptsRef.current < MAX_SCROLL_ATTEMPTS && hasMore) {
      void loadMore();
    } else {
      pendingScrollToRef.current = null;
    }
  }, [visibleMessages, hasMore, loadMore, tryScrollToMessage]);

  // Сбрасываем pending-scroll при смене чата
  React.useEffect(() => {
    pendingScrollToRef.current = null;
    scrollAttemptsRef.current = 0;
    setJumpToMessageId(null);
  }, [activeId]);

  const [isSecretChat, setIsSecretChat] = React.useState(false);

  // Check if active chat is a secret chat
  React.useEffect(() => {
    if (!activeId) { setIsSecretChat(false); return; }
    (async () => {
      try {
        const res = await fetch("/api/secret-chats", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const chats = data.data?.chats ?? data.chats ?? [];
          setIsSecretChat(chats.some((c: any) => c.chatId === activeId));
        }
      } catch { setIsSecretChat(false); }
    })();
  }, [activeId]);

  // Derived state for useEffect (computed before early return to satisfy hooks rules)
  const activeChat = activeId ? chatsMap[activeId] ?? null : null;
  const isService = activeChat?.type === "SERVICE";
  const isSelf = activeChat?.type === "SELF";
  const isGroup = activeChat?.type !== "PRIVATE" && activeChat?.type !== "SERVICE" && activeChat?.type !== "SELF";
  const isChannel = activeChat?.type === "CHANNEL";
  const other = activeChat?.participants.find((p) => p.id !== user?.id);

  // Check for message requests in private chats with non-contacts
  React.useEffect(() => {
    setMessageRequest(null);
    if (!activeChat || !other || !user) return;
    if (activeChat.type !== "PRIVATE") return;
    if (other.id === user.id) return;

    let cancelled = false;
    (async () => {
      try {
        // Check if other user is a contact
        const contactRes = await fetch("/api/contacts", { credentials: "include" });
        if (!contactRes.ok || cancelled) return;
        const contactData = await contactRes.json();
        const contacts = contactData.contacts ?? [];
        const isContact = contacts.some((c: any) => c.user?.id === other.id || c.targetId === other.id);
        if (isContact || cancelled) return;

        // Check for pending friend request from the other user
        const reqRes = await fetch("/api/contacts/requests", { credentials: "include" });
        if (!reqRes.ok || cancelled) return;
        const reqData = await reqRes.json();
        const received = reqData.received ?? [];
        const pendingFromOther = received.find((r: any) => r.senderId === other.id && r.status === "PENDING");
        if (pendingFromOther && !cancelled) {
          setMessageRequest({
            senderId: other.id,
            senderName: other.displayName,
            senderUsername: other.username,
            senderAvatarUrl: other.avatarUrl ?? null,
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [activeChat?.id, other?.id, user?.id, user]);

  // Если пользователь не залогинен (включая экран загрузки) — показываем лоадер
  if (userLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-sm">Загрузка…</div>
      </div>
    );
  }

  const chats: ChatListItemData[] = chatsOrder
    .map((id) => chatsMap[id])
    .filter((c): c is ChatPreview => Boolean(c))
    .map((c) => toChatListItem(c, user.id));

  const unreadChatCount = React.useMemo(() => {
    return chats.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);
  }, [chats]);

  const myRole = activeChat?.myRole;
  const canPostInChannel = !isChannel || myRole === "OWNER" || myRole === "ADMIN";
  const activeName = activeChat
    ? isService
      ? "NextX"
      : isSelf
        ? "Избранное"
        : isGroup
          ? activeChat.name ?? "Group"
          : other?.displayName ?? "Unknown"
    : "";

  return (
    <CallProvider>
    <CallController />
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* === Sidebar === */}
      <div
        className={cn(
          // Мобилка: шторка, выезжает поверх чата
          "fixed inset-y-0 left-0 z-40 h-full w-[85vw] max-w-[340px] transition-transform duration-200 ease-out md:relative md:translate-x-0",
          // Если есть активный чат на мобиле — прячем шторку
          activeChat ? "-translate-x-full md:translate-x-0" : "translate-x-0",
        )}
      >
        {chatsLoading ? (
          <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
            <div className="h-14 border-b border-sidebar-border" />
            <ChatListSkeleton />
          </div>
        ) : (
          <ChatList
            chats={chats}
            activeChatId={activeId ?? undefined}
            onSelect={setActiveId}
            userMenuSlot={
              <button
                type="button"
                onClick={() => setMainMenuOpen(true)}
                aria-label="Главное меню"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent"
              >
                <Menu className="h-5 w-5" />
              </button>
            }
            onCreateChat={() => setCreateChatOpen(true)}
            onGlobalSearch={() => setGlobalSearchOpen(true)}
            stories={stories}
            storiesLoading={storiesLoading}
            myUserId={user.id}
            myAvatarUrl={user.avatarUrl ?? null}
            myDisplayName={user.displayName}
            onCreateStory={() => setStoryComposerOpen(true)}
            onOpenStory={(group) => {
              setStoryViewerGroup(group);
            }}
            folders={folders.map((f) => ({
              id: f.id,
              name: f.name,
              icon: f.icon,
              chatCount: f.chatIds.length,
            }))}
            activeFolderId={activeFolderId}
            onSelectFolder={setActiveFolderId}
            onDeleteFolder={handleDeleteFolder}
            onCreateFolder={handleCreateFolder}
            folderChatIds={folderChatIds}
            userRole={user.role}
            onOpenAdmin={() => router.push("/admin/dashboard")}
            showUnreadOnly={showUnreadOnly}
            onToggleUnreadFilter={() => setShowUnreadOnly((v) => !v)}
            unreadCount={unreadChatCount}
          />
        )}
      </div>

      {/* Mobile: backdrop при открытом чате (только <md) */}
      {activeChat && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-black/30 opacity-0 transition-opacity duration-200 pointer-events-none md:!hidden"
          data-mobile-backdrop
        />
      )}

      {/* Offline status banner */}
      {!isOnline && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-yellow-500/90 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
          Нет подключения к сети
          {queueSize > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {queueSize} в очереди
            </span>
          )}
        </div>
      )}

      {/* === Active chat === */}
      {activeChat ? (
        pendingLockChatId === activeId ? (
          <ChatLockOverlay
            chatId={activeId!}
            onVerified={() => {
              setUnlockedChats((prev) => new Set(prev).add(activeId!));
              setPendingLockChatId(null);
            }}
          />
        ) : (
        <main className="flex h-full min-w-0 flex-1 flex-col">
          {searchOpen ? (
            <ChatSearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              matchIndex={searchIndex}
              matchCount={searchMatches.length}
              onPrev={goPrevMatch}
              onNext={goNextMatch}
              onClose={closeSearch}
              filter={searchFilter}
              onFilterChange={setSearchFilter}
              availableSenders={activeChat?.participants ?? []}
            />
          ) : (
            bulkMode ? (
              <BulkActionBar
                count={bulkSelected.size}
                onCancel={exitBulkMode}
                onDelete={handleBulkDelete}
                onForward={handleBulkForward}
              />
            ) : (
            <ChatTopBar
              chatId={activeId ?? undefined}
              name={activeName}
              avatarUrl={
                isService || isSelf
                  ? "/favicon.svg"
                  : isGroup
                    ? activeChat.avatarUrl
                    : other?.avatarUrl ?? null
              }
              isGroup={isGroup}
              isChannel={isChannel}
              isService={isService}
              isSelf={isSelf}
              memberCount={activeChat.participants.length}
              isOnline={!isGroup && other?.status === "ONLINE"}
              lastSeenAt={
                !isGroup && other
                  ? new Date(other.lastSeenAt).getTime()
                  : undefined
              }
              typingText={
                typingUsers.length > 0
                  ? `${typingUsers
                      .map(
                        (id) =>
                          activeChat.participants.find((p) => p.id === id)
                            ?.displayName ?? "",
                      )
                      .filter(Boolean)
                      .join(", ")} typing…`
                  : null
              }
              onOpenProfile={() => setProfileOpen(true)}
              onBack={() => setActiveId(null)}
              onSearch={openSearch}
              onCallAudio={() => {
                if (other) {
                  useCallStore.getState().setOutgoingRemote(
                    { id: other.id, displayName: other.displayName, avatarUrl: other.avatarUrl ?? null },
                    "AUDIO",
                  );
                }
              }}
              onCallVideo={() => {
                if (other) {
                  useCallStore.getState().setOutgoingRemote(
                    { id: other.id, displayName: other.displayName, avatarUrl: other.avatarUrl ?? null },
                    "VIDEO",
                  );
                }
              }}
              onGroupCall={() => setGroupCallOpen(true)}
              onJumpToMessage={(id) => {
                setJumpToMessageId(id);
              }}
            />
            ))}

          {/* Message request banner */}
          {messageRequest && !isGroup && !isChannel && !isService && !isSelf && (
            <MessageRequestBanner
              senderId={messageRequest.senderId}
              senderName={messageRequest.senderName}
              senderUsername={messageRequest.senderUsername}
              senderAvatarUrl={messageRequest.senderAvatarUrl}
              onAccepted={() => setMessageRequest(null)}
              onDismissed={() => setMessageRequest(null)}
            />
          )}

          {/* Voice Channels (group chats only) */}
          {isGroup && activeId && (
            <details className="border-b border-border group">
              <summary className="cursor-pointer px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 select-none">
                Голосовые каналы
              </summary>
              <VoiceChannelPanel chatId={activeId} currentUserId={user.id} />
            </details>
          )}

          <PinnedMessagesBar
            pinned={pinnedMessages}
            onJump={handleReplyClick}
            onUnpin={(id) => {
              void togglePin(id, false);
            }}
          />

          <div className="relative flex-1 overflow-hidden bg-chat">
            <ScrollArea
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full px-3 py-2"
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-0.5">
                {/* Sentinel: догружаем старые сообщения, когда он появляется в зоне видимости */}
                <div
                  ref={loadMoreSentinelRef}
                  aria-hidden
                  className="h-1 w-full"
                />
                {visibleMessages.length === 0 && (
                  <div className="flex h-[60vh] items-center justify-center">
                    <EmptyState
                      icon="💬"
                      title="Пока нет сообщений"
                      description="Напишите первое сообщение — и начнётся история."
                    />
                  </div>
                )}
                {visibleMessages.map((m) => {
                  const isOut = m.senderId === user.id;
                  const msgIdx = dedupedMessages.findIndex((d) => d.id === m.id);
                  const prev = msgIdx > 0 ? dedupedMessages[msgIdx - 1] : null;
                  const next = msgIdx < dedupedMessages.length - 1 ? dedupedMessages[msgIdx + 1] : null;
                  const isFirstInGroup =
                    !prev || prev.senderId !== m.senderId;
                  const isLastInGroup =
                    !next || next.senderId !== m.senderId;
                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isOutgoing={isOut}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      showSender={isGroup && !isOut}
                      myUserId={user.id}
                      onToggleReaction={toggleReaction}
                      onReply={(msg: MessageDTO) => {
                        setReplyTo({
                          id: msg.id,
                          senderId: msg.senderId,
                          type: msg.type,
                          content: msg.content,
                          mediaUrl: msg.mediaUrl,
                          fileName: msg.fileName ?? null,
                          sender: msg.sender ?? {
                            id: msg.senderId,
                            username: "unknown",
                            displayName: "Unknown",
                            avatarUrl: null,
                          },
                        });
                      }}
                      onReplyClick={handleReplyClick}
                      onEdit={async (id, content) => {
                        await editMessage(id, content);
                      }}
                      onDelete={async (id) => {
                        await deleteMessage(id);
                      }}
                      onForward={(msg) => setForwardMessage(msg)}
                      onCopyLink={() => toast.success("Ссылка скопирована")}
                      onSave={handleSaveMessage}
                      onSaveToCollection={handleSaveToCollection}
                      onTogglePin={async (id, pin) => {
                        await togglePin(id, pin);
                      }}
                      domRef={(el) => {
                        if (el) messageRefs.current.set(m.id, el);
                        else messageRefs.current.delete(m.id);
                      }}
                      searchQuery={
                        searchOpen && searchQuery ? searchQuery : undefined
                      }
                      isCurrentSearchMatch={
                        searchOpen && m.id === currentSearchMatchId
                      }
                      mediaGroup={mediaGroupMap.get(m.id) ?? null}
                      bulkMode={bulkMode}
                      bulkSelected={bulkSelected.has(m.id)}
                      onBulkToggle={handleBulkToggle}
                      isSecretChat={isSecretChat}
                      secretChatId={activeId ?? undefined}
                      userRole={myRole}
                      isPremium={myFeatures.includes("premium_reactions")}
                      isChatVerified={activeChat?.isVerified ?? false}
                      isChatContentProtected={activeChat?.isContentProtected ?? false}
                      onReport={(messageId, senderId) => setReportMessage({ messageId, senderId })}
                    />
                  );
                })}
              </div>
            </ScrollArea>

            <ScrollToBottomButton
              visible={!atBottom}
              count={unseenCount}
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              }}
              className="absolute bottom-3 right-4 z-20"
            />
          </div>

          {isService ? (
            <div className="border-t border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
              Служебные уведомления — только для чтения
            </div>
          ) : isChannel && !canPostInChannel ? (
            <div className="border-t border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
              В этом канале могут публиковать только админы.
            </div>
          ) : (
            <MessageInput
              onSend={async (text, attachments, opts) => {
                stopTyping();
                const replyToId = opts?.replyToId;
                if (opts?.contact) {
                  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                  const fd = new FormData();
                  fd.append("clientTempId", tempId);
                  fd.append("type", "CONTACT");
                  fd.append("content", JSON.stringify(opts.contact));
                  if (replyToId) fd.append("replyToId", replyToId);
                  try {
                    const r = await fetch(`/api/chats/${activeId}/messages`, {
                      method: "POST",
                      credentials: "include",
                      body: fd,
                    });
                    if (!r.ok) throw new Error(`send_failed_${r.status}`);
                  } catch (err) {
                    console.error("Contact send failed:", err);
                  }
                  setReplyTo(null);
                  return;
                }
                if (opts?.location) {
                  // LOCATION-сообщение
                  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                  const fd = new FormData();
                  fd.append("clientTempId", tempId);
                  fd.append("type", "LOCATION");
                  fd.append("content", text);
                  if (opts.location.placeName) {
                    fd.append("linkTitle", opts.location.placeName);
                  }
                  if (replyToId) fd.append("replyToId", replyToId);
                  if (opts.mentions) fd.append("mentions", JSON.stringify(opts.mentions));
                  if (opts.ttlSeconds) fd.append("ttlSeconds", String(opts.ttlSeconds));
                  try {
                    const r = await fetch(`/api/chats/${activeId}/messages`, {
                      method: "POST",
                      credentials: "include",
                      body: fd,
                    });
                    if (!r.ok) throw new Error(`send_failed_${r.status}`);
                  } catch (err) {
                    console.error("Location send failed:", err);
                  }
                  setReplyTo(null);
                  return;
                }
                await sendMessage(text, attachments, {
                  replyToId,
                  mentions: opts?.mentions,
                  ttlSeconds: opts?.ttlSeconds,
                  keyboard: opts?.keyboard,
                  scheduledFor: opts?.scheduledFor,
                  isViewOnce: opts?.isViewOnce,
                  isSilent: opts?.isSilent,
                });
                setReplyTo(null);
              }}
              onTyping={startTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              chatId={activeId ?? undefined}
              participants={activeChat?.participants ?? []}
            />
          )}
        </main>
        )) : (
        <main className="hidden h-full flex-1 items-center justify-center bg-chat text-muted-foreground md:flex">
          <EmptyState
            icon="💬"
            title="Выберите чат"
            description="Или создайте новый, нажав на иконку карандаша слева."
          />
        </main>
      )}

      {/* === Profile drawer === */}
      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUserId={user.id}
        onChanged={() => refreshChats()}
        chat={
          activeChat
            ? {
                name: activeName,
                avatarUrl: isGroup
                  ? activeChat.avatarUrl
                  : other?.avatarUrl ?? null,
                animatedAvatarUrl: !isGroup ? (other as any)?.animatedAvatarUrl ?? null : null,
                type: activeChat.type,
                isOnline: !isGroup && other?.status === "ONLINE",
                memberCount: activeChat.participants.length,
                isMuted: activeChat.isMuted,
                username: other?.username,
                bio: other?.bio ?? undefined,
                otherUserId: !isGroup ? other?.id : undefined,
                chatId: activeChat.id,
                description: activeChat.description ?? null,
                stealthMode: !isGroup ? other?.stealthMode : undefined,
                usernameHistory: !isGroup ? other?.usernameHistory : undefined,
                website: !isGroup ? (other as any)?.website ?? null : null,
                socialLinks: !isGroup ? (other as any)?.socialLinks ?? null : null,
                premiumStatus: !isGroup ? (other as any)?.premiumStatus ?? null : null,
              }
            : null
        }
      />

      {/* === Forward modal === */}
      <ForwardModal
        open={forwardMessage !== null}
        message={forwardMessage}
        chats={chats}
        currentUserId={user.id}
        onClose={closeForward}
        onForward={handleForward}
      />

      {/* === Report dialog === */}
      {reportMessage && (
        <ReportDialog
          messageId={reportMessage.messageId}
          targetUserId={reportMessage.senderId}
          onClose={() => setReportMessage(null)}
        />
      )}

      {/* === Profile edit modal === */}
      <ProfileEditModal
        open={profileEditOpen}
        onClose={() => setProfileEditOpen(false)}
      />

      {/* === Create chat modal === */}
      <CreateChatModal
        open={createChatOpen}
        onClose={() => setCreateChatOpen(false)}
        onCreatePrivate={handleCreatePrivate}
        onCreateGroup={handleCreateGroup}
        onCreateChannel={handleCreateChannel}
      />

      {/* === Global search modal === */}
      <GlobalSearchModal
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        onSelectResult={handleGlobalSearchSelect}
        currentUserId={user.id}
      />

      {/* === Main menu (Telegram-style hamburger drawer) === */}
      <MainMenu
        open={mainMenuOpen}
        onClose={() => setMainMenuOpen(false)}
        onEditProfile={() => setProfileEditOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenContacts={() => setContactsOpen(true)}
        onOpenWallet={() => setWalletOpen(true)}
        onOpenCreate={() => setCreateChatOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenPremium={() => setPremiumOpen(true)}
        onSendGift={() => {
          setContactsOpen(true);
          toast.info("Выберите контакт для отправки подарка");
        }}
        onOpenMyGifts={() => setMyGiftsOpen(true)}
        onOpenPayments={() => setMyPaymentsOpen(true)}
        onOpenTrash={() => setTrashOpen(true)}
        onOpenShop={() => setShopOpen(true)}
        onOpenCloud={() => router.push("/cloud")}
        onOpenFreelance={() => router.push("/freelance")}
        onOpenTeamExchange={() => router.push("/team-exchange")}
        onOpenWorkspace={() => router.push("/workspace")}
        onOpenAlbums={() => setAlbumsOpen(true)}
        onOpenRecentFiles={() => setRecentFilesOpen(true)}
        onOpenCollections={() => setCollectionsOpen(true)}
        onOpenScheduledQueue={() => setScheduledQueueOpen(true)}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onOpenEmail={() => router.push("/email")}
        onNavigate={(chatType) => {
          const chats = Object.values(chatsMap) as ChatPreview[];
          const found = chats.find((c) => c.type === chatType);
          if (found) setActiveId(found.id);
          else toast.info("Чат не найден. Откройте приложение заново.");
        }}
        activeChatId={activeId}
      />

      {/* === Settings modal === */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenSupport={() => setSupportOpen(true)}
        chatActions={
          activeChat
            ? {
                isMuted: activeChat.isMuted,
                isPinned: activeChat.isPinned,
                isGroup,
                isService,
                isSelf,
                chatName: activeName,
                chatPinHash: activeChat.chatPinHash ?? null,
                onToggleMute: async () => {
                  if (!activeId) return;
                  try {
                    const res = await fetch(`/api/chats/${activeId}/mute`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ muted: !activeChat?.isMuted }),
                    });
                    if (!res.ok) throw new Error();
                    await refreshChats();
                  } catch {
                    toast.error("Не удалось изменить уведомления");
                  }
                },
                onTogglePin: async () => {
                  if (!activeId) return;
                  try {
                    const res = await fetch(`/api/chats/${activeId}/pin`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pinned: !activeChat?.isPinned }),
                    });
                    if (!res.ok) throw new Error();
                    await refreshChats();
                    toast.success(activeChat?.isPinned ? "Откреплено" : "Закреплено");
                  } catch {
                    toast.error("Не удалось изменить");
                  }
                },
                onClearHistory: async () => {
                  if (!activeId) return;
                  try {
                    const res = await fetch(`/api/chats/${activeId}/clear`, {
                      method: "POST",
                      credentials: "include",
                    });
                    await refreshChats();
                    toast.success("История очищена");
                  } catch { toast.error("Ошибка"); }
                },
                onLeaveChat: async () => {
                  if (!activeId) return;
                  try {
                    const res = await fetch(`/api/chats/${activeId}/leave`, {
                      method: "POST",
                      credentials: "include",
                    });
                    if (!res.ok) throw new Error();
                    setActiveId(null);
                    await refreshChats();
                  } catch {
                    toast.error("Не удалось покинуть чат");
                  }
                },
                onBlockUser: async () => {
                  if (!other?.id) return;
                  try {
                    const res = await fetch(`/api/users/${other.id}/block`, {
                      method: "POST",
                      credentials: "include",
                    });
                    if (!res.ok) throw new Error();
                    toast.success("Пользователь заблокирован");
                  } catch {
                    toast.error("Не удалось заблокировать");
                  }
                },
                onTogglePinLock: () => {
                  setSettingsOpen(false);
                },
              }
            : undefined
        }
      />

      {/* === Premium modal === */}
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      {/* === My Gifts modal === */}
      <MyGiftsModal open={myGiftsOpen} onClose={() => setMyGiftsOpen(false)} />
      <AlbumsModal open={albumsOpen} onClose={() => setAlbumsOpen(false)} />
      <RecentFilesModal open={recentFilesOpen} onClose={() => setRecentFilesOpen(false)} />
      <CollectionsModal open={collectionsOpen} onClose={() => setCollectionsOpen(false)} />
      <ScheduledQueueModal open={scheduledQueueOpen} onClose={() => setScheduledQueueOpen(false)} />
      <BookmarksModal open={bookmarksOpen} onClose={() => setBookmarksOpen(false)} />
      <SaveToCollectionModal
        open={saveToCollectionOpen}
        onClose={() => {
          setSaveToCollectionOpen(false);
          setSaveToCollectionMessage(null);
        }}
        messageId={saveToCollectionMessage?.id ?? ""}
        chatId={saveToCollectionMessage?.chatId ?? ""}
        onSave={() => {
          // Optionally refresh data or show toast
        }}
      />

      {/* === My Payments modal === */}
      <MyPaymentsModal open={myPaymentsOpen} onClose={() => setMyPaymentsOpen(false)} />

      {/* === Trash modal === */}
      <TrashModal open={trashOpen} onClose={() => setTrashOpen(false)} />
      <ProfileShopModal open={shopOpen} onClose={() => setShopOpen(false)} />

      {/* === Contacts modal === */}
      <ContactsModal
        open={contactsOpen}
        onClose={() => setContactsOpen(false)}
        onOpenChat={(userId) => {
          // Find or create DM with this user
          const allChats = Object.values(chatsMap) as ChatPreview[];
          const existingChat = allChats.find(
            (c) => c.type === "PRIVATE" && c.participants?.some((p: any) => p.id === userId),
          );
          if (existingChat) {
            setActiveId(existingChat.id);
          } else {
            setContactsOpen(false);
            toast.info("Начните чат из поиска");
          }
        }}
      />

      {/* === Wallet modal === */}
      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
      />

      {/* === Support form === */}
      <SupportForm
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
      />

      {/* === Gift modal === */}
      {giftTarget && (
        <GiftModal
          open={!!giftTarget}
          onClose={() => setGiftTarget(null)}
          recipientId={giftTarget.id}
          recipientName={giftTarget.name}
          recipientAvatar={giftTarget.avatar}
        />
      )}

      {/* === Story composer === */}
      <StoryComposer
        open={storyComposerOpen}
        onClose={() => setStoryComposerOpen(false)}
        onCreated={(s) => {
          setStories((prev) => [s, ...prev]);
        }}
      />

      {/* === Story viewer === */}
      {storyViewerGroup && (
        <StoryViewer
          groups={[
            storyViewerGroup,
            ...groupStoriesForViewer(stories, storyViewerGroup.author.id),
          ]}
          startGroupIdx={0}
          myUserId={user.id}
          onClose={() => setStoryViewerGroup(null)}
          onDelete={(id) => {
            setStories((prev) => prev.filter((s) => s.id !== id));
            setStoryViewerGroup((g) =>
              g
                ? {
                    ...g,
                    stories: g.stories.filter((s) => s.id !== id),
                  }
                : null,
            );
          }}
          onOpenChat={(chatId) => {
            setActiveId(chatId);
            void refreshChats();
          }}
          onHighlightChange={(id, name) => {
            setStories((prev) =>
              prev.map((s) => (s.id === id ? { ...s, highlightName: name } : s)),
            );
            setStoryViewerGroup((g) =>
              g
                ? {
                    ...g,
                    stories: g.stories.map((s) =>
                      s.id === id ? { ...s, highlightName: name } : s,
                    ),
                  }
                : null,
            );
          }}
        />
      )}

      {/* Group call modal */}
      {groupCallOpen && activeId && activeChat && isGroup && (
        <GroupCallModal
          chatId={activeId}
          chatName={activeName}
          participantIds={activeChat.participants.map((p) => p.id)}
          participantNames={Object.fromEntries(activeChat.participants.map((p) => [p.id, p.displayName]))}
          kind="AUDIO"
          onClose={() => setGroupCallOpen(false)}
        />
      )}

      {/* Floating theme switcher — bottom left */}
      <div className="pointer-events-auto absolute bottom-3 left-3 z-50">
        <ThemeToggle />
      </div>

      {/* Music Player */}
      <MusicPlayer />
    </div>
    </CallProvider>
  );
}

/** Управляет модалками звонков: toast входящего, полный экран звонка */
function CallController() {
  const call = useCallContext();
  const { outgoingRemote, outgoingKind } = useCallStore();

  // Автостарт исходящего звонка когда store设置了outgoingRemote
  React.useEffect(() => {
    if (outgoingRemote && call.state === "IDLE" && !call.active) {
      void call.startCall(outgoingRemote, outgoingKind);
    }
  }, [outgoingRemote, call, call.state, call.active, outgoingKind]);

  // При входящем звонке — показываем тост
  const showIncomingToast = call.state === "INCOMING" && call.incoming;
  // При входящем, подтверждённом (accept) — показываем полный экран
  const showIncomingModal = call.state !== "IDLE" && call.active && !call.active.isOutgoing;
  // При исходящем — показываем полный экран
  const showOutgoingModal = call.state !== "IDLE" && call.active?.isOutgoing;
  // При исходящем (pending offer) — ещё нет active, но state OUTGOING
  const showPendingOutgoing = call.state === "OUTGOING" && !call.active;

  return (
    <>
      {/* Incoming toast */}
      {showIncomingToast && (
        <IncomingCallToast
          onAccept={() => void call.acceptCall()}
        />
      )}
      {/* Incoming full-screen modal */}
      {showIncomingModal && (
        <IncomingCallModal onClose={() => { call.hangup(); }} />
      )}
      {/* Outgoing full-screen modal */}
      {(showOutgoingModal || showPendingOutgoing) && outgoingRemote && (
        <OutgoingCallModal
          remote={outgoingRemote}
          kind={outgoingKind}
          onClose={() => {
            call.hangup();
            useCallStore.getState().setOutgoingRemote(null);
          }}
        />
      )}
    </>
  );
}

function BulkActionBar({
  count,
  onCancel,
  onDelete,
  onForward,
}: {
  count: number;
  onCancel: () => void;
  onDelete: () => void;
  onForward: () => void;
}) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Отмена"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="flex-1 text-sm font-medium">
        Выбрано: {count}
      </div>
      <button
        type="button"
        onClick={onForward}
        disabled={count === 0}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
        aria-label="Переслать"
      >
        <Share2 className="h-4.5 w-4.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={count === 0}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
        aria-label="Удалить"
      >
        <Trash2 className="h-4.5 w-4.5" />
      </button>
    </header>
  );
}

function groupStoriesForViewer(
  allStories: Array<{
    id: string;
    authorId: string;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    mediaUrl: string;
    mediaType: "IMAGE" | "VIDEO";
    caption: string | null;
    createdAt: string;
    expiresAt: string;
    viewCount: number;
    viewedByMe: boolean;
    highlightName: string | null;
  }>,
  currentAuthorId: string,
) {
  const others = allStories.filter((s) => s.authorId !== currentAuthorId);
  const map = new Map<
    string,
    {
      author: typeof others[number]["author"];
      stories: typeof others;
      allViewed: boolean;
    }
  >();
  for (const s of others) {
    const g = map.get(s.authorId);
    if (g) g.stories.push(s);
    else map.set(s.authorId, { author: s.author, stories: [s], allViewed: false });
  }
  return Array.from(map.values())
    .map((g) => ({
      ...g,
      allViewed: g.stories.every((s) => s.viewedByMe),
    }))
    .sort((a, b) => {
      if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1;
      const aMax = Math.max(...a.stories.map((s) => +new Date(s.createdAt)));
      const bMax = Math.max(...b.stories.map((s) => +new Date(s.createdAt)));
      return bMax - aMax;
    });
}

function ChatLockOverlay({
  chatId,
  onVerified,
}: {
  chatId: string;
  onVerified: () => void;
}) {
  const [pin, setPin] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleVerify = React.useCallback(async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("PIN должен содержать 4 цифры");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chats/${chatId}/pin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action: "verify" }),
      });
      const data = await res.json();
      if (res.ok) {
        onVerified();
      } else {
        if (data.error === "wrong_pin") setError("Неверный PIN");
        else setError("Ошибка");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }, [pin, chatId, onVerified]);

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-chat">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-background p-8 shadow-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Чат заблокирован</h3>
        <p className="text-sm text-muted-foreground">Введите 4-значный PIN</p>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && handleVerify()}
          placeholder="PIN"
          className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-primary focus:outline-none"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={handleVerify}
          disabled={pin.length !== 4 || loading}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40"
        >
          {loading ? "..." : "Открыть"}
        </button>
      </div>
    </main>
  );
}
