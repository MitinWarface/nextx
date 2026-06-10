"use client";

import * as React from "react";
import {
  Plus,
  X,
  Sticker as StickerIcon,
  Trash2,
  Search,
  FolderPlus,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

interface Sticker {
  id: string;
  emoji: string | null;
  mediaUrl: string;
  packName: string;
  createdAt: string;
}

interface StickerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sticker: { url: string; stickerId: string }) => void;
}

export function StickerPicker({ open, onClose, onSelect }: StickerPickerProps) {
  const [stickers, setStickers] = React.useState<Sticker[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [activePack, setActivePack] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const myFeatures = useAuthStore((s) => s.user?.features ?? []);
  const isPremium = myFeatures.includes("premium_stickers");

  // Load stickers
  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stickers");
      if (!res.ok) return;
      const data = (await res.json()) as { stickers: Sticker[] };
      setStickers(data.stickers);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  // Esc to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Список пакетов
  const packs = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stickers) {
      map.set(s.packName, (map.get(s.packName) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [stickers]);

  // Активный пак (по умолчанию первый)
  React.useEffect(() => {
    if (!activePack && packs.length > 0) setActivePack(packs[0].name);
  }, [activePack, packs]);

  const visibleStickers = React.useMemo(() => {
    let list = stickers.filter((s) => s.packName === activePack);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = stickers.filter(
        (s) =>
          (s.emoji?.toLowerCase().includes(q) ?? false) ||
          s.packName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [stickers, activePack, searchQuery]);

  const handleUpload = async (file: File, packName?: string) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (packName) fd.append("packName", packName);
      const res = await fetch("/api/stickers", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (res.ok) await reload();
    } finally {
      setUploading(false);
    }
  };

  const handleAddToNewPack = async (file: File) => {
    const name = prompt("Имя нового пака:");
    if (!name?.trim()) return;
    await handleUpload(file, name.trim());
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить стикер?")) return;
    const res = await fetch(`/api/stickers/${id}`, { method: "DELETE" });
    if (res.ok) await reload();
  };

  if (!open) return null;
  return (
    <div
      className="absolute bottom-full left-2 z-30 mb-1 flex w-80 flex-col gap-1 rounded-xl border border-border bg-card p-2 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold">Стикеры</h3>
        <div className="flex items-center gap-1">
          {!isPremium && (
            <span className="flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
              <Crown className="h-2.5 w-2.5" />
              {stickers.length}/20
            </span>
          )}
          {isPremium && (
            <span className="flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
              <Crown className="h-2.5 w-2.5" />
              ∞
            </span>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Добавить в текущий пак"
            aria-label="Добавить стикер"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = () => {
                const f = input.files?.[0];
                if (f) handleAddToNewPack(f);
              };
              input.click();
            }}
            disabled={uploading}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Создать новый пак"
            aria-label="Создать новый пак"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Закрыть"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f, activePack ?? undefined);
            e.target.value = "";
          }}
        />
      </div>

      {/* Search */}
      <div className="relative px-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск стикеров..."
          className="h-7 w-full rounded border border-border bg-muted/30 pl-7 pr-2 text-[11.5px] focus:border-primary focus:outline-none"
        />
      </div>

      {/* Pack tabs */}
      {packs.length > 1 && !searchQuery && (
        <div className="flex gap-1 overflow-x-auto px-1">
          {packs.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setActivePack(p.name)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[10.5px] transition-colors",
                activePack === p.name
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {p.name} <span className="opacity-60">· {p.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="max-h-56 overflow-y-auto">
        {loading ? (
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
            Загрузка…
          </div>
        ) : visibleStickers.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <StickerIcon className="h-5 w-5 opacity-40" />
            <span>{searchQuery ? "Ничего не найдено" : "Нет стикеров"}</span>
            <span className="text-[10px]">Загрузите свой</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1">
            {visibleStickers.map((s) => (
              <div
                key={s.id}
                className="group relative aspect-square overflow-hidden rounded-md bg-muted/40 hover:bg-muted"
              >
                <button
                  type="button"
                  onClick={() => onSelect({ url: s.mediaUrl, stickerId: s.id })}
                  className="block h-full w-full"
                  aria-label="Отправить стикер"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.mediaUrl}
                    alt={s.emoji ?? "sticker"}
                    loading="lazy"
                    className="h-full w-full object-contain p-1"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="absolute right-0.5 top-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
