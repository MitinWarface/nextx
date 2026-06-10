"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, Gift, Smile, Trophy, Frame, Image, Award } from "lucide-react";

interface CollectionItem {
  id: string;
  name?: string;
  emoji?: string;
  icon?: string;
  description?: string;
  rarity?: string;
  type?: string;
  sender?: { username: string; displayName: string } | null;
  createdAt?: string;
}

interface CollectionsModalProps {
  open: boolean;
  onClose: () => void;
}

type TabKey = "gifts" | "stickers" | "achievements" | "frames" | "backgrounds" | "badges";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "gifts", label: "Подарки", icon: <Gift className="h-4 w-4" /> },
  { key: "stickers", label: "Стикеры", icon: <Smile className="h-4 w-4" /> },
  { key: "achievements", label: "Достижения", icon: <Trophy className="h-4 w-4" /> },
  { key: "frames", label: "Рамки", icon: <Frame className="h-4 w-4" /> },
  { key: "backgrounds", label: "Фоны", icon: <Image className="h-4 w-4" /> },
  { key: "badges", label: "Бейджи", icon: <Award className="h-4 w-4" /> },
];

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-blue-500",
  epic: "text-purple-500",
  legendary: "text-amber-500",
};

export function CollectionsModal({ open, onClose }: CollectionsModalProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("gifts");
  const [data, setData] = React.useState<Record<TabKey, CollectionItem[]>>({
    gifts: [],
    stickers: [],
    achievements: [],
    frames: [],
    backgrounds: [],
    badges: [],
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/users/me/collections")
      .then((r) => r.json())
      .then((d) => {
        setData({
          gifts: d.gifts ?? [],
          stickers: d.stickers ?? [],
          achievements: d.achievements ?? [],
          frames: d.frames ?? [],
          backgrounds: d.backgrounds ?? [],
          badges: d.badges ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items = data[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 flex h-[80vh] w-full max-w-lg flex-col rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Коллекция</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
              {data[tab.key].length > 0 && (
                <span className="ml-0.5 text-[10px] opacity-70">
                  {data[tab.key].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Загрузка...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Trophy className="mb-2 h-8 w-8 opacity-30" />
              <p>Пока пусто</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col items-center rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                >
                  <span className="mb-1 text-2xl">
                    {item.emoji ?? item.icon ?? "✨"}
                  </span>
                  <span className="w-full truncate text-center text-xs font-medium">
                    {item.name ?? item.description ?? item.id.slice(0, 8)}
                  </span>
                  {item.rarity && (
                    <span className={cn("text-[10px] capitalize", RARITY_COLORS[item.rarity] ?? "")}>
                      {item.rarity}
                    </span>
                  )}
                  {item.sender && (
                    <span className="text-[10px] text-muted-foreground">
                      от {item.sender.displayName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
