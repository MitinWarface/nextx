"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface CustomEmojiItem {
  id: string;
  shortcode: string;
  imageUrl: string;
  createdAt: string;
}

interface CustomEmojiProps {
  onSelect?: (shortcode: string, imageUrl: string) => void;
  className?: string;
}

export function CustomEmoji({ onSelect, className }: CustomEmojiProps) {
  const [emojis, setEmojis] = React.useState<CustomEmojiItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [shortcode, setShortcode] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadEmojis();
  }, []);

  async function loadEmojis() {
    try {
      const res = await fetch("/api/users/me/custom-emoji");
      const data = await res.json();
      setEmojis(data.emojis ?? []);
    } catch {
      toast.error("Failed to load custom emoji");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !shortcode.trim()) {
      toast.error("Select a file and enter a shortcode");
      return;
    }

    const cleaned = shortcode.trim().replace(/:/g, "");
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      toast.error("Shortcode: only letters, numbers, underscores");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("shortcode", cleaned);

      const res = await fetch("/api/users/me/custom-emoji", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }

      setEmojis((prev) => [data.emoji, ...prev]);
      setShortcode("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success(`Emoji :${cleaned}: created`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, sc: string) {
    try {
      const res = await fetch("/api/users/me/custom-emoji", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      setEmojis((prev) => prev.filter((e) => e.id !== id));
      toast.success(`Emoji :${sc}: deleted`);
    } catch {
      toast.error("Delete failed");
    }
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-4 text-sm text-muted-foreground", className)}>
        Loading...
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileRef}
          accept="image/*"
          className="hidden"
          onChange={() => {
            const f = fileRef.current?.files?.[0];
            if (f && !shortcode) {
              const name = f.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_");
              setShortcode(name);
            }
          }}
        />
        <input
          type="text"
          placeholder=":shortcode:"
          value={shortcode}
          onChange={(e) => setShortcode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUpload()}
          className="flex-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-input px-3 py-1 text-sm hover:bg-accent"
          disabled={uploading}
        >
          Choose
        </button>
        <button
          type="button"
          onClick={handleUpload}
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={uploading || !shortcode.trim()}
        >
          {uploading ? "..." : "Upload"}
        </button>
      </div>

      {emojis.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          No custom emoji yet. Upload an image (128x128 recommended).
        </p>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          {emojis.map((emoji) => (
            <div
              key={emoji.id}
              className="group relative flex flex-col items-center gap-1 rounded-md border border-border p-2 hover:bg-accent"
            >
              <button
                type="button"
                onClick={() => onSelect?.(emoji.shortcode, emoji.imageUrl)}
                className="h-10 w-10 cursor-pointer overflow-hidden rounded"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={emoji.imageUrl}
                  alt={`:${emoji.shortcode}:`}
                  className="h-full w-full object-contain"
                />
              </button>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                :{emoji.shortcode}:
              </span>
              <button
                type="button"
                onClick={() => handleDelete(emoji.id, emoji.shortcode)}
                className="absolute -top-1 -right-1 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground group-hover:flex"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
