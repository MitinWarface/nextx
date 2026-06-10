"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Search, Forward, FileText, Image as ImageIcon, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MessageDTO } from "@/types";
import type { ChatListItemData } from "./chat-list";

interface ForwardModalProps {
  open: boolean;
  message: MessageDTO | null;
  chats: ChatListItemData[];
  currentUserId: string;
  onClose: () => void;
  onForward: (targetChatId: string, hideAuthor?: boolean) => Promise<void> | void;
}

export function ForwardModal({
  open,
  message,
  chats,
  currentUserId: _currentUserId,
  onClose,
  onForward,
}: ForwardModalProps) {
  const [query, setQuery] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [hideAuthor, setHideAuthor] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setPending(null);
      setError(null);
      setHideAuthor(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.toLowerCase();
    return chats.filter((c) => c.name.toLowerCase().includes(q));
  }, [chats, query]);

  const handleSelect = async (chatId: string) => {
    if (pending || !message) return;
    setPending(chatId);
    setError(null);
    try {
      await onForward(chatId, hideAuthor);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось переслать сообщение",
      );
      setPending(null);
    }
  };

  if (!open || !message) return null;
  const portalNode = typeof document !== "undefined" ? document.body : null;
  if (!portalNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
      aria-label="Переслать сообщение"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Forward className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Переслать сообщение</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Message preview */}
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Сообщение</p>
          <ForwardPreview message={message} />
        </div>

        {/* Search */}
        <div className="border-b border-border px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск чата"
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Hide author option */}
        <div className="border-b border-border px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-accent/50">
            <input
              type="checkbox"
              checked={hideAuthor}
              onChange={(e) => setHideAuthor(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <div className="flex items-center gap-2">
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Скрыть автора</span>
            </div>
          </label>
        </div>

        {/* Chats list */}
        <ScrollArea className="max-h-80 flex-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Чаты не найдены
            </div>
          ) : (
            <ul className="flex flex-col py-1">
              {filtered.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(chat.id)}
                    disabled={pending !== null}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                      "hover:bg-accent/60 disabled:opacity-50",
                      pending === chat.id && "bg-accent/40",
                    )}
                  >
                    <Avatar
                      name={chat.name}
                      src={chat.avatarUrl}
                      size="md"
                      online={chat.type === "PRIVATE" && chat.isOnline}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {chat.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {chat.type === "PRIVATE"
                          ? "Личный чат"
                          : chat.type === "GROUP"
                            ? `Группа${chat.memberCount ? ` · ${chat.memberCount}` : ""}`
                            : "Канал"}
                      </span>
                    </div>
                    {pending === chat.id && (
                      <span className="text-xs text-primary">…</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {error && (
          <div className="border-t border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>,
    portalNode,
  );
}

function ForwardPreview({ message }: { message: MessageDTO }) {
  const senderName = message.sender?.displayName ?? "Пользователь";
  if (message.type === "IMAGE" && message.mediaUrl) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.mediaUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{senderName}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            Фото
            {message.content ? ` · ${message.content}` : ""}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-1 flex items-start gap-2">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{senderName}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {message.content || (message.type !== "TEXT" ? `[${labelFor(message.type)}]` : "")}
        </p>
      </div>
    </div>
  );
}

function labelFor(type: MessageDTO["type"]): string {
  switch (type) {
    case "VIDEO":
      return "Видео";
    case "FILE":
      return "Файл";
    case "AUDIO":
      return "Аудио";
    case "VOICE":
      return "Голосовое сообщение";
    case "IMAGE":
      return "Фото";
    default:
      return "Сообщение";
  }
}
