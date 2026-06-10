"use client";

import * as React from "react";
import { X, Clipboard, Link, Type, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ClipboardEntry {
  id: string;
  text: string;
  isLink: boolean;
  timestamp: number;
}

interface ClipboardHistoryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
}

const MAX_ITEMS = 20;
const STORAGE_KEY = "nextx:clipboard-history";

function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function loadHistory(): ClipboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveHistory(items: ClipboardEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}

export function useClipboardHistory() {
  const [items, setItems] = React.useState<ClipboardEntry[]>([]);

  React.useEffect(() => {
    setItems(loadHistory());
  }, []);

  const addEntry = React.useCallback((text: string) => {
    if (!text.trim()) return;
    const entry: ClipboardEntry = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim(),
      isLink: isUrl(text.trim()),
      timestamp: Date.now(),
    };
    setItems((prev) => {
      // Deduplicate
      const filtered = prev.filter((i) => i.text !== entry.text);
      const next = [entry, ...filtered].slice(0, MAX_ITEMS);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeEntry = React.useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearAll = React.useCallback(() => {
    setItems([]);
    saveHistory([]);
  }, []);

  return { items, addEntry, removeEntry, clearAll };
}

export function ClipboardHistory({ open, onClose, onSelect }: ClipboardHistoryProps) {
  const [items, setItems] = React.useState<ClipboardEntry[]>([]);

  React.useEffect(() => {
    if (open) setItems(loadHistory());
  }, [open]);

  const handleSelect = (text: string) => {
    onSelect(text);
    onClose();
  };

  const handleRemove = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveHistory(next);
      return next;
    });
  };

  const handleClear = () => {
    setItems([]);
    saveHistory([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div
        className="fixed bottom-20 right-4 z-[101] w-80 rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Clipboard className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Буфер обмена</span>
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded p-1 text-xs text-muted-foreground hover:bg-accent"
              >
                Очистить
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 hover:bg-accent"
              aria-label="Закрыть"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <ScrollArea className="max-h-64">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clipboard className="mb-1 h-6 w-6 opacity-40" />
              <p className="text-xs">Пусто</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.text)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="mt-0.5 shrink-0 text-muted-foreground">
                    {item.isLink ? <Link className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "truncate text-xs",
                      item.isLink ? "text-primary underline" : "",
                    )}>
                      {item.text}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.id);
                    }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
