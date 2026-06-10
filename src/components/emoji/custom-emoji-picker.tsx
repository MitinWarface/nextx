"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface EmojiItem {
  id: string;
  shortcode: string;
  imageUrl: string;
}

interface CustomEmojiPickerProps {
  onSelect?: (shortcode: string, imageUrl: string) => void;
  className?: string;
}

export function CustomEmojiPicker({ onSelect, className }: CustomEmojiPickerProps) {
  const [emojis, setEmojis] = React.useState<EmojiItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [shortcode, setShortcode] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch("/api/users/me/custom-emoji")
      .then((r) => r.json())
      .then((d) => setEmojis(d.emojis ?? []))
      .catch(() => toast.error("Failed to load emoji"))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !shortcode.trim()) {
      toast.error("Select a file and enter a shortcode");
      return;
    }
    const cleaned = shortcode.trim().replace(/:/g, "");
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      toast.error("Shortcode: letters, numbers, underscores only");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("shortcode", cleaned);
      const res = await fetch("/api/users/me/custom-emoji", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      setEmojis((prev) => [data.emoji, ...prev]);
      setShortcode("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success(`:${cleaned}: created`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
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
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <input
          type="file"
          ref={fileRef}
          accept="image/*"
          className="hidden"
          onChange={() => {
            const f = fileRef.current?.files?.[0];
            if (f && !shortcode) setShortcode(f.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_"));
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
          className="rounded-md border border-input px-2 py-1 text-sm hover:bg-accent"
          disabled={uploading}
        >
          Choose
        </button>
        <button
          type="button"
          onClick={handleUpload}
          className="rounded-md bg-primary px-2 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={uploading || !shortcode.trim()}
        >
          {uploading ? "..." : "Add"}
        </button>
      </div>

      {emojis.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">No custom emoji yet</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {emojis.map((emoji) => (
            <button
              key={emoji.id}
              type="button"
              onClick={() => onSelect?.(emoji.shortcode, emoji.imageUrl)}
              title={`:${emoji.shortcode}:`}
              className="h-8 w-8 overflow-hidden rounded border border-border p-0.5 hover:bg-accent hover:ring-1 hover:ring-primary/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={emoji.imageUrl} alt={`:${emoji.shortcode}:`} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
