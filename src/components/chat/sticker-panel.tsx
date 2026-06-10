"use client";

import * as React from "react";
import {
  X,
  Crown,
  ShoppingBag,
  Sticker as StickerIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Sticker {
  id: string;
  emoji: string | null;
  mediaUrl: string;
  packName: string;
  createdAt: string;
}

interface StickerPack {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  isPublic: boolean;
  isPremium: boolean;
  authorId: string;
  stickers: Sticker[];
  author: { id: string; displayName: string; avatarUrl: string | null };
}

interface StickerPanelProps {
  onClose: () => void;
  onSelectSticker: (sticker: { url: string; stickerId: string }) => void;
}

export function StickerPanel({ onClose, onSelectSticker }: StickerPanelProps) {
  const [packs, setPacks] = React.useState<StickerPack[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activePackId, setActivePackId] = React.useState<string | null>(null);
  const [showShop, setShowShop] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/sticker-packs", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const data = d.data ?? d;
        setPacks(data.packs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!activePackId && packs.length > 0) {
      setActivePackId(packs[0].id);
    }
  }, [activePackId, packs]);

  const activePack = packs.find((p) => p.id === activePackId);

  React.useEffect(() => {
    if (!showShop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowShop(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showShop]);

  return (
    <>
      <div
        className="mb-1 w-full rounded-xl border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <StickerIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Стикеры</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Закрыть"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pack tabs */}
        {packs.length > 0 && (
          <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setActivePackId(pack.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] transition-colors",
                  activePackId === pack.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {pack.emoji && <span>{pack.emoji}</span>}
                <span>{pack.name}</span>
                {pack.isPremium && (
                  <Crown className="h-2.5 w-2.5 text-amber-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Sticker grid */}
        <div className="max-h-48 overflow-y-auto p-2">
          {loading ? (
            <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
              Загрузка…
            </div>
          ) : packs.length === 0 ? (
            <div className="flex h-20 flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
              <StickerIcon className="h-5 w-5 opacity-40" />
              <span>Нет стикерпаков</span>
            </div>
          ) : activePack && activePack.stickers.length > 0 ? (
            <div className="grid grid-cols-5 gap-1">
              {activePack.stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => {
                    onSelectSticker({ url: sticker.mediaUrl, stickerId: sticker.id });
                  }}
                  className="aspect-square overflow-hidden rounded-md bg-muted/30 p-1 transition-colors hover:bg-muted"
                  aria-label="Отправить стикер"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sticker.mediaUrl}
                    alt={sticker.emoji ?? "sticker"}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
              Нет стикеров в паке
            </div>
          )}
        </div>

        {/* Shop link */}
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setShowShop(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Магазин стикерпаков
          </button>
        </div>
      </div>

      {/* Shop modal */}
      {showShop && (
        <StickerPackShop onClose={() => setShowShop(false)} />
      )}
    </>
  );
}

function StickerPackShop({ onClose }: { onClose: () => void }) {
  const [packs, setPacks] = React.useState<StickerPack[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [installing, setInstalling] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sticker-packs", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setPacks((d.data ?? d).packs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleInstall = async (packId: string) => {
    setInstalling(packId);
    try {
      await fetch(`/api/sticker-packs/${packId}/install`, { method: "POST", credentials: "include" });
      await reload();
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (packId: string) => {
    setInstalling(packId);
    try {
      await fetch(`/api/sticker-packs/${packId}/install`, { method: "DELETE", credentials: "include" });
      await reload();
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Магазин стикерпаков</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Загрузка…
            </div>
          ) : packs.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <StickerIcon className="h-8 w-8 opacity-40" />
              <span>Пока нет стикерпаков</span>
            </div>
          ) : (
            <div className="space-y-3">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                    {pack.emoji ?? "🎨"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{pack.name}</span>
                      {pack.isPremium && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">
                          <Crown className="h-2.5 w-2.5" />
                          Premium
                        </span>
                      )}
                    </div>
                    {pack.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {pack.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {pack.stickers.length} стикеров · от {pack.author.displayName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInstall(pack.id)}
                    disabled={installing === pack.id}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {installing === pack.id ? "…" : "Установить"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
