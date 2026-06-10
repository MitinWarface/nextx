"use client";

import * as React from "react";
import { X, Image as ImageIcon, FileText, Music, Link, MapPin, Pin, Video, Mic, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePickerModal } from "./date-picker-modal";

interface MediaItem {
  id: string;
  type: string;
  url: string;
  fileName?: string;
  createdAt: string;
  senderName?: string;
}

interface QuickNavigationProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  onJumpToMessage?: (messageId: string) => void;
}

type TabKey = "media" | "files" | "links" | "music" | "voice" | "video" | "pinned";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "media", label: "Медиа", icon: <ImageIcon className="h-4 w-4" /> },
  { key: "files", label: "Файлы", icon: <FileText className="h-4 w-4" /> },
  { key: "links", label: "Ссылки", icon: <Link className="h-4 w-4" /> },
  { key: "music", label: "Музыка", icon: <Music className="h-4 w-4" /> },
  { key: "voice", label: "Голосовые", icon: <Mic className="h-4 w-4" /> },
  { key: "video", label: "Видео", icon: <Video className="h-4 w-4" /> },
  { key: "pinned", label: "Закреплённые", icon: <Pin className="h-4 w-4" /> },
];

export function QuickNavigation({
  open,
  onClose,
  chatId,
  onJumpToMessage,
}: QuickNavigationProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey | "date">("media");
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open || !chatId || activeTab === "date") return;
    setLoading(true);
    setItems([]);

    const typeParam =
      activeTab === "pinned" ? "pinned" :
      activeTab === "media" ? "image" :
      activeTab === "files" ? "file" :
      activeTab === "links" ? "link" :
      activeTab === "music" ? "audio" :
      activeTab === "voice" ? "voice" :
      activeTab === "video" ? "video" : "image";

    fetch(`/api/chats/${chatId}/media?type=${typeParam}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, chatId, activeTab]);

  const handleDateSelect = async (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    try {
      const res = await fetch(
        `/api/chats/${chatId}/messages/by-date?date=${dateStr}`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = (await res.json()) as { messageId: string };
        onJumpToMessage?.(data.messageId);
        onClose();
      } else {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        if (err?.error === "no_messages_found") {
          alert("Нет сообщений за эту дату");
        }
      }
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  return (
    <>
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-[80vh] w-[90vw] max-w-lg flex-col rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Быстрая навигация</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Calendar className="h-4 w-4" />
            Перейти к дате
          </button>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MapPin className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Ничего не найдено</p>
            </div>
          ) : activeTab === "links" ? (
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onJumpToMessage?.(item.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
                >
                  <Link className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.url}</p>
                    <p className="text-xs text-muted-foreground">{item.senderName} · {formatDate(item.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onJumpToMessage?.(item.id);
                    onClose();
                  }}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border transition-colors hover:border-primary"
                >
                  {item.type === "IMAGE" || item.type === "GIF" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.fileName ?? ""}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : item.type === "VIDEO" ? (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Video className="h-8 w-8 text-muted-foreground" />
                    </div>
                  ) : item.type === "AUDIO" || item.type === "VOICE" ? (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted p-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
                    <p className="truncate text-[10px] text-white">{item.fileName ?? formatDate(item.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    <DatePickerModal
      open={datePickerOpen}
      onClose={() => setDatePickerOpen(false)}
      onSelect={handleDateSelect}
    />
    </>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}
