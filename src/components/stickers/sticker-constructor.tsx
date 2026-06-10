"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface StickerItem {
  id?: string;
  mediaUrl: string;
  emoji?: string;
  file?: File;
  preview?: string;
}

interface StickerPackData {
  id: string;
  name: string;
  emoji?: string;
  stickers: { id: string; mediaUrl: string; emoji?: string }[];
}

interface StickerConstructorProps {
  className?: string;
  onSaved?: (pack: StickerPackData) => void;
}

const MAX_FREE_PACKS = 5;

export function StickerConstructor({ className, onSaved }: StickerConstructorProps) {
  const [packName, setPackName] = React.useState("");
  const [packEmoji, setPackEmoji] = React.useState("");
  const [stickers, setStickers] = React.useState<StickerItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [isPremium, setIsPremium] = React.useState(false);
  const [packCount, setPackCount] = React.useState(0);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadInfo();
  }, []);

  async function loadInfo() {
    try {
      const res = await fetch("/api/sticker-packs");
      const data = await res.json();
      const myPacks = (data.packs ?? []).filter(
        (p: StickerPackData) => p.id && p.stickers !== undefined,
      );
      setPackCount(myPacks.length);
      // Check premium via session
      const meRes = await fetch("/api/users/me");
      const meData = await meRes.json();
      setIsPremium(meData.premiumStatus === "active");
    } catch {
      // Non-critical
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    addFiles(Array.from(files));
    if (fileRef.current) fileRef.current.value = "";
  }

  function addFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Only image files are supported");
      return;
    }

    const newStickers: StickerItem[] = imageFiles.map((file) => ({
      mediaUrl: "",
      file,
      preview: URL.createObjectURL(file),
    }));

    setStickers((prev) => [...prev, ...newStickers]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function removeSticker(idx: number) {
    setStickers((prev) => {
      const next = [...prev];
      if (next[idx].preview) URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  }

  function moveSticker(idx: number, dir: -1 | 1) {
    setStickers((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateEmoji(idx: number, emoji: string) {
    setStickers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], emoji };
      return next;
    });
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragEnter(idx: number) {
    if (dragIdx === null || dragIdx === idx) return;
    setStickers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      return data.url ?? null;
    } catch {
      return null;
    }
  }

  async function handleSave() {
    if (!packName.trim()) {
      toast.error("Enter a pack name");
      return;
    }
    if (stickers.length === 0) {
      toast.error("Add at least one sticker");
      return;
    }
    if (!isPremium && packCount >= MAX_FREE_PACKS) {
      toast.error(`Free users can create up to ${MAX_FREE_PACKS} packs. Upgrade to Premium for unlimited.`);
      return;
    }

    setSaving(true);
    try {
      // Create pack
      const packRes = await fetch("/api/sticker-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: packName.trim(),
          emoji: packEmoji || undefined,
          isPublic: true,
        }),
      });
      const packData = await packRes.json();
      if (!packRes.ok) {
        toast.error(packData.error ?? "Failed to create pack");
        return;
      }

      const packId = packData.pack.id;

      // Upload stickers sequentially
      for (const sticker of stickers) {
        let mediaUrl = sticker.mediaUrl;
        if (sticker.file) {
          const url = await uploadFile(sticker.file);
          if (!url) {
            toast.error("Failed to upload sticker image");
            continue;
          }
          mediaUrl = url;
        } else if (sticker.preview) {
          mediaUrl = sticker.preview;
        }

        await fetch(`/api/sticker-packs/${packId}/stickers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaUrl, emoji: sticker.emoji || undefined }),
        });
      }

      toast.success("Sticker pack created!");
      setPackName("");
      setPackEmoji("");
      setStickers([]);
      setPackCount((c) => c + 1);
      onSaved?.({ id: packId, name: packName, emoji: packEmoji, stickers: [] });
    } catch {
      toast.error("Failed to save sticker pack");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Pack name"
          value={packName}
          onChange={(e) => setPackName(e.target.value)}
          className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
          maxLength={100}
        />
        <input
          type="text"
          placeholder="Emoji"
          value={packEmoji}
          onChange={(e) => setPackEmoji(e.target.value.slice(0, 4))}
          className="w-16 rounded-md border border-input bg-transparent px-2 py-2 text-center text-sm outline-none"
          maxLength={4}
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 text-center transition-colors hover:border-primary/50"
      >
        <p className="mb-2 text-sm text-muted-foreground">
          Drag & drop images here or{" "}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-primary underline"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-muted-foreground">PNG, GIF, WEBP — 512x512 recommended</p>
        <input
          type="file"
          ref={fileRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {stickers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {stickers.length} sticker{stickers.length !== 1 ? "s" : ""} — drag to reorder
          </p>
          <div className="grid grid-cols-5 gap-2">
            {stickers.map((sticker, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "group relative flex flex-col items-center gap-1 rounded-md border border-border p-1.5 transition-opacity",
                  dragIdx === idx ? "opacity-50" : "",
                )}
              >
                <div className="h-14 w-14 overflow-hidden rounded bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sticker.preview ?? sticker.mediaUrl}
                    alt="sticker"
                    className="h-full w-full object-contain"
                  />
                </div>
                <input
                  type="text"
                  placeholder="emoji"
                  value={sticker.emoji ?? ""}
                  onChange={(e) => updateEmoji(idx, e.target.value.slice(0, 4))}
                  className="w-full rounded border border-input bg-transparent px-1 py-0.5 text-center text-[10px] outline-none"
                  maxLength={4}
                />
                <div className="absolute -top-1 -right-1 hidden items-center gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    onClick={() => moveSticker(idx, -1)}
                    disabled={idx === 0}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground hover:bg-accent disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSticker(idx, 1)}
                    disabled={idx === stickers.length - 1}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground hover:bg-accent disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSticker(idx)}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isPremium ? "Premium: unlimited packs" : `Free: ${packCount}/${MAX_FREE_PACKS} packs`}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || stickers.length === 0 || !packName.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Pack"}
        </button>
      </div>
    </div>
  );
}
