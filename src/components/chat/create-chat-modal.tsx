"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Search, Check, Loader2, Users, UserPlus, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/types";

interface CreateChatModalProps {
  open: boolean;
  onClose: () => void;
  onCreatePrivate?: (otherUserId: string) => Promise<void>;
  onCreateGroup?: (name: string, memberIds: string[], description?: string) => Promise<void>;
  onCreateChannel?: (name: string, memberIds: string[], description?: string, isPrivate?: boolean, maxSubscribers?: number) => Promise<void>;
}

type Mode = "PRIVATE" | "GROUP" | "CHANNEL";

export function CreateChatModal({
  open,
  onClose,
  onCreatePrivate,
  onCreateGroup,
  onCreateChannel,
}: CreateChatModalProps) {
  const [mode, setMode] = React.useState<Mode>("PRIVATE");
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<PublicUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [groupName, setGroupName] = React.useState("");
  const [groupDescription, setGroupDescription] = React.useState("");
  const [channelIsPrivate, setChannelIsPrivate] = React.useState(false);
  const [maxSubscribers, setMaxSubscribers] = React.useState<string>("");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset on open
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setUsers([]);
      setSelectedIds(new Set());
      setGroupName("");
      setGroupDescription("");
      setChannelIsPrivate(false);
      setMaxSubscribers("");
      setError(null);
      setMode("PRIVATE");
    }
  }, [open]);

  // Esc to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creating) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, creating]);

  // Debounced fetch
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      void fetch(`/api/users?${params}`, { credentials: "include" })
        .then(async (r) => {
          if (!r.ok) throw new Error("load_failed");
          return (await r.json()) as { users: PublicUser[] };
        })
        .then((data) => setUsers(data.users))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [open, query]);

  const toggleSelect = (id: string) => {
    if (mode === "PRIVATE") {
      setSelectedIds(new Set([id]));
    } else {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    setError(null);
    if (mode === "PRIVATE") {
      const [first] = selectedIds;
      if (!first) {
        setError("Выберите пользователя");
        return;
      }
      if (!onCreatePrivate) return;
      setCreating(true);
      try {
        await onCreatePrivate(first);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "create_failed");
      } finally {
        setCreating(false);
      }
      return;
    }
    if (!groupName.trim()) {
      setError(
        mode === "CHANNEL" ? "Введите название канала" : "Введите название группы",
      );
      return;
    }
    if (mode === "GROUP" && selectedIds.size < 2) {
      setError("Выберите минимум 2 участников");
      return;
    }
    if (mode === "CHANNEL" && selectedIds.size < 1) {
      setError("Добавьте хотя бы одного подписчика");
      return;
    }
    if (mode === "GROUP" && !onCreateGroup) return;
    if (mode === "CHANNEL" && !onCreateChannel) return;
    setCreating(true);
    try {
      if (mode === "CHANNEL" && onCreateChannel) {
        const maxSub = maxSubscribers ? parseInt(maxSubscribers, 10) : undefined;
        await onCreateChannel(groupName.trim(), Array.from(selectedIds), groupDescription.trim() || undefined, channelIsPrivate, maxSub);
      } else if (mode === "GROUP" && onCreateGroup) {
        await onCreateGroup(groupName.trim(), Array.from(selectedIds), groupDescription.trim() || undefined);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "create_failed");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;
  const portalNode = typeof document !== "undefined" ? document.body : null;
  if (!portalNode) return null;

  const isPrivate = mode === "PRIVATE";
  const isGroup = mode === "GROUP";
  const isChannel = mode === "CHANNEL";
  const placeholder =
    isPrivate
      ? "Поиск пользователей"
      : isGroup
        ? "Поиск участников"
        : "Поиск подписчиков";
  const minSelected = isPrivate ? 1 : isGroup ? 2 : 1;
  const createLabel = isPrivate
    ? "Начать чат"
    : isGroup
      ? "Создать группу"
      : "Создать канал";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
      aria-label="Создать чат"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !creating) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Новый чат</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Mode toggle */}
        <div className="flex border-b border-border px-2 py-2">
          <ModeTab
            active={isPrivate}
            onClick={() => {
              setMode("PRIVATE");
              setSelectedIds(new Set());
              setError(null);
            }}
            icon={<UserPlus className="h-4 w-4" />}
            label="Личный"
          />
          <ModeTab
            active={isGroup}
            onClick={() => {
              setMode("GROUP");
              setSelectedIds(new Set());
              setError(null);
            }}
            icon={<Users className="h-4 w-4" />}
            label="Группа"
          />
          <ModeTab
            active={isChannel}
            onClick={() => {
              setMode("CHANNEL");
              setSelectedIds(new Set());
              setError(null);
            }}
            icon={<Megaphone className="h-4 w-4" />}
            label="Канал"
          />
        </div>

        {/* Group/Channel name */}
        {!isPrivate && (
          <div className="border-b border-border px-4 py-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {isChannel ? "Название канала" : "Название группы"}
              </label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={isChannel ? "Например, Новости" : "Например, Команда дизайна"}
                maxLength={120}
                disabled={creating}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Описание (необязательно)
              </label>
              <Input
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Краткое описание"
                maxLength={500}
                disabled={creating}
              />
            </div>
            {isChannel && (
              <>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelIsPrivate}
                      onChange={(e) => setChannelIsPrivate(e.target.checked)}
                      disabled={creating}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Приватный канал (только по ссылке)
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Лимит подписчиков (0 = без лимита)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={maxSubscribers}
                    onChange={(e) => setMaxSubscribers(e.target.value)}
                    placeholder="0"
                    className="w-32"
                    disabled={creating}
                  />
                </div>
              </>
            )}
            {isChannel && (
              <p className="text-[11px] text-muted-foreground">
                Публиковать могут только админы. Подписчики только читают.
              </p>
            )}
          </div>
        )}

        {/* Search */}
        <div className="border-b border-border px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-9 pl-8 text-sm"
              disabled={creating}
            />
          </div>
          {!isPrivate && selectedIds.size > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Выбрано: {selectedIds.size}
            </p>
          )}
        </div>

        {/* User list */}
        <ScrollArea className="max-h-72 flex-1">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Загружаем…
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {query.trim() ? "Не найдено" : "Нет пользователей"}
            </div>
          ) : (
            <ul className="flex flex-col py-1">
              {users.map((u) => {
                const selected = selectedIds.has(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => toggleSelect(u.id)}
                      disabled={creating}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        "hover:bg-accent/60 disabled:opacity-50",
                        selected && "bg-accent/40",
                      )}
                    >
                      <Avatar
                        name={u.displayName}
                        src={u.avatarUrl}
                        size="md"
                        online={u.status === "ONLINE"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {u.displayName}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          @{u.username}
                        </div>
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {error && (
          <div className="border-t border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={creating}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={creating || selectedIds.size < minSelected}
          >
            {creating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Создаём…
              </>
            ) : (
              createLabel
            )}
          </Button>
        </div>
      </div>
    </div>,
    portalNode,
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
