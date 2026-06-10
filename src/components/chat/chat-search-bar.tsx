"use client";

import * as React from "react";
import { ArrowLeft, ChevronUp, ChevronDown, X, Filter, User as UserIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/types";
import { toast } from "@/store/toast-store";

export type SearchFilterKind = "all" | "text" | "media" | "files" | "links";

export interface SearchFilter {
  kind: SearchFilterKind;
  senderId: string | null;
}

interface ChatSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  matchIndex: number;
  matchCount: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  className?: string;
  filter: SearchFilter;
  onFilterChange: (f: SearchFilter) => void;
  availableSenders?: PublicUser[];
  aiSearchEnabled?: boolean;
  onToggleAiSearch?: () => void;
  chatId?: string;
}

const FILTER_KINDS: Array<{ id: SearchFilterKind; label: string }> = [
  { id: "all", label: "Все" },
  { id: "text", label: "Текст" },
  { id: "media", label: "Медиа" },
  { id: "files", label: "Файлы" },
  { id: "links", label: "Ссылки" },
];

export function ChatSearchBar({
  query,
  onQueryChange,
  matchIndex,
  matchCount,
  onPrev,
  onNext,
  onClose,
  className,
  filter,
  onFilterChange,
  availableSenders = [],
  aiSearchEnabled = false,
  onToggleAiSearch,
  chatId,
}: ChatSearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const filtersRef = React.useRef<HTMLDivElement | null>(null);
  const [aiSearching, setAiSearching] = React.useState(false);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  React.useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      if (filtersRef.current?.contains(e.target as Node)) return;
      setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [filtersOpen]);

  const activeSender = filter.senderId
    ? availableSenders.find((s) => s.id === filter.senderId)
    : null;

  const activeFiltersCount =
    (filter.kind !== "all" ? 1 : 0) + (filter.senderId ? 1 : 0);

  return (
    <header
      className={cn(
        "flex h-14 items-center gap-2 border-b border-border bg-background px-3",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть поиск"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder="Поиск в чате"
        className={cn(
          "h-9 flex-1 rounded-md border border-transparent bg-muted/60 px-3 text-sm",
          "placeholder:text-muted-foreground",
          "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        )}
      />

      <div ref={filtersRef} className="relative">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-label="Фильтры"
          aria-expanded={filtersOpen}
          className={cn(
            "relative inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm transition-colors",
            activeFiltersCount > 0
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Filter className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="text-[10px] font-semibold">
              {activeFiltersCount}
            </span>
          )}
        </button>
        {filtersOpen && (
          <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-border bg-card p-2 shadow-xl">
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Тип
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {FILTER_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => onFilterChange({ ...filter, kind: k.id })}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[12px] transition-colors",
                    filter.kind === k.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-foreground hover:bg-muted",
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <div className="mt-2 border-t border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              От кого
            </div>
            <div className="max-h-48 overflow-y-auto px-1">
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, senderId: null })}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                  !filter.senderId
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-accent",
                )}
              >
                <UserIcon className="h-3.5 w-3.5" />
                Все участники
              </button>
              {availableSenders.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onFilterChange({ ...filter, senderId: s.id })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                    filter.senderId === s.id
                      ? "bg-primary/15 text-primary"
                      : "hover:bg-accent",
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                    {s.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate">{s.displayName}</span>
                  {s.username && (
                    <span className="truncate text-[10px] text-muted-foreground">
                      @{s.username}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {(filter.kind !== "all" || filter.senderId) && (
              <button
                type="button"
                onClick={() => onFilterChange({ kind: "all", senderId: null })}
                className="mt-2 w-full rounded-md bg-destructive/10 py-1.5 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/20"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}
      </div>

      {onToggleAiSearch && (
        <button
          type="button"
          onClick={onToggleAiSearch}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm transition-colors",
            aiSearchEnabled
              ? "bg-purple-500/15 text-purple-500"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          aria-label="AI поиск"
          title="AI-расширенный поиск"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden text-xs font-medium md:inline">AI</span>
        </button>
      )}

      {activeSender && (
        <span className="hidden max-w-[120px] truncate rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary md:inline-block">
          {activeSender.displayName}
        </span>
      )}

      {query && (
        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
          {matchCount > 0
            ? `${matchIndex + 1} из ${matchCount}`
            : "Нет совпадений"}
        </span>
      )}

      <button
        type="button"
        onClick={onPrev}
        disabled={matchCount === 0}
        aria-label="Предыдущее совпадение"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={matchCount === 0}
        aria-label="Следующее совпадение"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      {query && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Очистить"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </header>
  );
}
