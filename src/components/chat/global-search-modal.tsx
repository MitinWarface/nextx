"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Search, Loader2, MessageSquare, Calendar, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatLastSeen } from "@/lib/utils";
import type { MessageDTO } from "@/types";

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectResult: (chatId: string, messageId: string) => void;
  currentUserId: string;
  chats?: Array<{ id: string; name: string; type: string }>;
  users?: Array<{ id: string; displayName: string; avatarUrl?: string | null }>;
}

interface SearchResult {
  message: MessageDTO;
  chat: { id: string; name: string | null; type: "PRIVATE" | "GROUP" | "CHANNEL" };
}

export function GlobalSearchModal({
  open,
  onClose,
  onSelectResult,
  currentUserId: _currentUserId,
  chats = [],
  users = [],
}: GlobalSearchModalProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [filterChatId, setFilterChatId] = React.useState<string>("");
  const [filterFromUser, setFilterFromUser] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset on open
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
      setShowFilters(false);
      setFilterChatId("");
      setFilterFromUser("");
      setDateFrom("");
      setDateTo("");
    } else {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Esc to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Debounced fetch with filters
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const hasFilter = filterChatId || filterFromUser || dateFrom || dateTo;
    if (q.length < 2 && !hasFilter) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filterChatId) params.set("chatId", filterChatId);
      if (filterFromUser) params.set("fromUserId", filterFromUser);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo + "T23:59:59.999Z");
      params.set("limit", "30");

      void fetch(`/api/messages/search?${params}`, { credentials: "include" })
        .then(async (r) => {
          if (!r.ok) {
            const err = (await r.json().catch(() => null)) as
              | { error?: string }
              | null;
            throw new Error(err?.error ?? `search_failed_${r.status}`);
          }
          return (await r.json()) as { results: SearchResult[] };
        })
        .then((data) => {
          setResults(data.results);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "search_failed");
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [open, query, filterChatId, filterFromUser, dateFrom, dateTo]);

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result.chat.id, result.message.id);
    onClose();
  };

  const hasActiveFilters = filterChatId || filterFromUser || dateFrom || dateTo;

  if (!open) return null;
  const portalNode = typeof document !== "undefined" ? document.body : null;
  if (!portalNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Глобальный поиск"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по сообщениям..."
            className="h-9 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              showFilters || hasActiveFilters
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            title="Фильтры"
          >
            <Filter className="h-4 w-4" />
          </button>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Filters panel */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 border-b border-border px-4 py-3">
            {/* Chat filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase text-muted-foreground">Чат</label>
              <select
                value={filterChatId}
                onChange={(e) => setFilterChatId(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
              >
                <option value="">Все чаты</option>
                {chats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* User filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase text-muted-foreground">От кого</label>
              <select
                value={filterFromUser}
                onChange={(e) => setFilterFromUser(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
              >
                <option value="">Все пользователи</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase text-muted-foreground">С даты</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent pl-7 pr-2 text-xs"
                />
              </div>
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase text-muted-foreground">По дату</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent pl-7 pr-2 text-xs"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterChatId("");
                  setFilterFromUser("");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="self-end rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                Сбросить
              </button>
            )}
          </div>
        )}

        {/* Results */}
        <ScrollArea className="max-h-[60vh]">
          {query.trim().length < 2 && !hasActiveFilters ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              Введите минимум 2 символа для поиска
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center text-sm text-destructive">
              Ошибка поиска: {error}
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              Ничего не найдено
            </div>
          ) : (
            <ul className="flex flex-col py-1">
              {results.map((r) => (
                <li key={r.message.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(r)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/60"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-muted-foreground">
                          {chatLabel(r)}
                        </span>
                        <span className="shrink-0 text-[10.5px] text-muted-foreground">
                          {formatLastSeen(new Date(r.message.createdAt).getTime())}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium">
                        {r.message.sender?.displayName ?? "Кто-то"}
                      </p>
                      <p className="line-clamp-2 text-sm text-foreground/80">
                        {highlightMatch(r.message.content ?? "", query)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>,
    portalNode,
  );
}

function chatLabel(r: SearchResult): string {
  if (r.chat.type !== "PRIVATE") return r.chat.name ?? "Группа";
  return r.chat.name ?? "Личный чат";
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/30 px-0.5 text-inherit">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
