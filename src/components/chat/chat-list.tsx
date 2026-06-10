"use client";

import * as React from "react";
import { CheckCheck, Search, X, PencilLine, Megaphone, Shield, Crown, Lock, Pin, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatLastSeen } from "@/lib/utils";
import { StoriesBar, type StoryItem, type StoryGroup } from "./stories-bar";
import { FolderTabs, type FolderTab } from "./folder-tabs";
import { ArchiveSwipe } from "./archive-swipe";
import { UnreadFilter } from "./unread-filter";

export interface ChatListItemData {
  id: string;
  name: string;
  avatarUrl?: string | null;
  type: "PRIVATE" | "GROUP" | "CHANNEL" | "SERVICE" | "SELF";
  lastMessage?: {
    content: string | null;
    senderName?: string | null;
    createdAt: number;
  } | null;
  unreadCount: number;
  isMuted: boolean;
  isVerified: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isOnline?: boolean;
  memberCount?: number;
  status?: string;
  isPremium?: boolean;
  statusEmoji?: string | null;
  statusText?: string | null;
  customStatus?: string | null;
  chatPinHash?: string | null;
  colorLabel?: string | null;
}

interface ChatListProps {
  chats: ChatListItemData[];
  activeChatId?: string;
  onSelect: (id: string) => void;
  className?: string;
  userMenuSlot?: React.ReactNode;
  onCreateChat?: () => void;
  onGlobalSearch?: () => void;
  stories?: StoryItem[];
  myUserId?: string;
  myAvatarUrl?: string | null;
  myDisplayName?: string;
  storiesLoading?: boolean;
  onCreateStory?: () => void;
  onOpenStory?: (group: StoryGroup) => void;
  folders?: FolderTab[];
  activeFolderId?: string | null;
  onSelectFolder?: (folderId: string | null) => void;
  onDeleteFolder?: (folderId: string) => void;
  onCreateFolder?: (name: string, chatTypes: string[]) => void;
  folderChatIds?: Record<string, string[]>;
  userRole?: string;
  onOpenAdmin?: () => void;
  onArchive?: (chatId: string) => void;
  showUnreadOnly?: boolean;
  onToggleUnreadFilter?: () => void;
  unreadCount?: number;
}

export function ChatList({
  chats,
  activeChatId,
  onSelect,
  className,
  userMenuSlot,
  onCreateChat,
  onGlobalSearch,
  stories = [],
  myUserId,
  myAvatarUrl,
  myDisplayName,
  storiesLoading = false,
  onCreateStory,
  onOpenStory,
  folders = [],
  activeFolderId = null,
  onSelectFolder,
  onDeleteFolder,
  onCreateFolder,
  folderChatIds,
  userRole,
  onOpenAdmin,
  onArchive,
  showUnreadOnly = false,
  onToggleUnreadFilter,
  unreadCount = 0,
}: ChatListProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    let list = chats;

    // Фильтр по папке
    if (activeFolderId && folderChatIds?.[activeFolderId]) {
      const ids = new Set(folderChatIds[activeFolderId]);
      list = list.filter((c) => ids.has(c.id));
    }

    // Фильтр "Непрочитанные"
    if (showUnreadOnly) {
      list = list.filter((c) => c.unreadCount > 0);
    }

    // Поиск по имени
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    return list;
  }, [chats, query, activeFolderId, folderChatIds, showUnreadOnly]);

  // Telegram: сначала закреплённые, потом по lastMessageAt desc
  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (
        (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0)
      );
    });
  }, [filtered]);

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar",
        className,
      )}
    >
      {/* Header */}
      <header className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
        {userMenuSlot}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-8 pl-8 pr-8 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Очистить"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {onCreateChat && (
          <button
            type="button"
            onClick={onCreateChat}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Создать чат"
            title="Создать чат"
          >
            <PencilLine className="h-4 w-4" />
          </button>
        )}
        {onGlobalSearch && (
          <button
            type="button"
            onClick={onGlobalSearch}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Глобальный поиск"
            title="Поиск по сообщениям"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
        {userRole && userRole !== "USER" && onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent"
            aria-label="Панель управления"
            title="Панель управления"
          >
            <Shield className="h-5 w-5" />
          </button>
        )}
      </header>

      {/* Folder Tabs */}
      {folders.length > 0 && onSelectFolder && (
        <FolderTabs
          folders={folders}
          activeFolderId={activeFolderId}
          onSelect={onSelectFolder}
          onDeleteFolder={onDeleteFolder}
          onCreateFolder={onCreateFolder}
        />
      )}

      {/* Unread filter */}
      {onToggleUnreadFilter && (
        <UnreadFilter
          unreadCount={unreadCount}
          isActive={showUnreadOnly}
          onToggle={onToggleUnreadFilter}
        />
      )}

      {/* Stories */}
      {onCreateStory && onOpenStory && myUserId && (
        <StoriesBar
          stories={stories}
          myUserId={myUserId}
          myAvatarUrl={myAvatarUrl ?? null}
          myDisplayName={myDisplayName ?? "Вы"}
          onOpenStory={onOpenStory}
          onCreateStory={onCreateStory}
          loading={storiesLoading}
        />
      )}

      {/* List */}
      <ScrollArea className="flex-1">
        <ul className="flex flex-col">
          {sorted.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Чаты не найдены
            </li>
          )}
          {sorted.map((chat) => (
            <ArchiveSwipe
              key={chat.id}
              chatId={chat.id}
              isArchived={chat.isArchived}
              onArchive={(id) => onArchive?.(id)}
            >
              <ChatRow
                chat={chat}
                active={chat.id === activeChatId}
                onClick={() => onSelect(chat.id)}
              />
            </ArchiveSwipe>
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}

interface ChatRowProps {
  chat: ChatListItemData;
  active: boolean;
  onClick: () => void;
}

const COLOR_DOT_MAP: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

function ChatRow({ chat, active, onClick }: ChatRowProps) {
  const hasUnread = chat.unreadCount > 0;
  const time = chat.lastMessage
    ? formatLastSeen(chat.lastMessage.createdAt)
    : "";
  const isLocked = !!chat.chatPinHash;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
          "hover:bg-accent/60",
          active && "bg-sidebar-accent",
        )}
      >
        <Avatar
          name={chat.name}
          src={chat.avatarUrl}
          size="md"
          online={chat.type === "PRIVATE" && chat.isOnline}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              {chat.isPinned && (
                <Pin
                  className="h-3 w-3 shrink-0 text-muted-foreground"
                  aria-label="pinned"
                />
              )}
              {chat.isArchived && (
                <Archive
                  className="h-3 w-3 shrink-0 text-muted-foreground"
                  aria-label="archived"
                />
              )}
              {chat.colorLabel && chat.colorLabel in COLOR_DOT_MAP && (
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    COLOR_DOT_MAP[chat.colorLabel],
                  )}
                  aria-label={chat.colorLabel}
                />
              )}
              {chat.type === "CHANNEL" && (
                <Megaphone
                  className="h-3.5 w-3.5 shrink-0 text-primary"
                  aria-label="channel"
                />
              )}
              <span
                className={cn(
                  "truncate text-[15px] leading-tight",
                  hasUnread ? "font-semibold" : "font-medium",
                )}
              >
                {chat.name}
              </span>
              {chat.isPremium && (
                <Crown className="h-3 w-3 shrink-0 text-amber-500" />
              )}
              {chat.isVerified && (
                <CheckCheck
                  className="h-3.5 w-3.5 shrink-0 text-primary"
                  aria-label="verified"
                />
              )}
              {isLocked && (
                <Lock
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-label="locked"
                />
              )}
            </div>
            <span
              className={cn(
                "shrink-0 text-xs",
                hasUnread ? "text-primary" : "text-muted-foreground",
              )}
            >
              {time}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-[13px] leading-tight",
                hasUnread ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {chat.lastMessage ? (
                <>
                  {chat.type !== "PRIVATE" && chat.lastMessage.senderName && (
                    <span className="font-medium text-foreground/80">
                      {chat.lastMessage.senderName}:{" "}
                    </span>
                  )}
                  {chat.lastMessage.content ?? "📎 Вложение"}
                </>
              ) : chat.statusEmoji ? (
                <span className="text-muted-foreground">
                  {chat.statusEmoji} {chat.statusText ?? chat.customStatus}
                </span>
              ) : (
                <span className="italic">Нет сообщений</span>
              )}
            </p>

            <div className="flex shrink-0 items-center gap-1">
              {chat.isMuted && (
                <span className="text-muted-foreground" aria-label="Без звука">
                  🔕
                </span>
              )}
              {hasUnread && !chat.isMuted && (
                <Badge variant={chat.isMuted ? "default" : "primary"}>
                  {chat.unreadCount}
                </Badge>
              )}
              {hasUnread && chat.isMuted && (
                <Badge
                  variant="default"
                  className="bg-muted-foreground/40 text-foreground"
                >
                  {chat.unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}
