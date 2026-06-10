"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, ImagePlus, Send, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface StoryComposerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (story: {
    id: string;
    authorId: string;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    mediaUrl: string;
    mediaType: "IMAGE" | "VIDEO";
    caption: string | null;
    createdAt: string;
    expiresAt: string;
    viewCount: number;
    viewedByMe: boolean;
    highlightName: string | null;
  }) => void;
}

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_BYTES = 25 * 1024 * 1024;

export function StoryComposer({ open, onClose, onCreated }: StoryComposerProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !uploading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, uploading, onClose]);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isVideo = file?.type.startsWith("video/");

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!ALLOWED.has(f.type)) {
      toast.error("Формат не поддерживается");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Файл больше 25 МБ");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (caption.trim()) fd.append("caption", caption.trim().slice(0, 500));
      fd.append("mediaType", file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
      const res = await fetch("/api/stories", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(err?.error ?? "upload_failed");
      }
      const data = (await res.json()) as { story: Parameters<typeof onCreated>[0] };
      toast.success("История опубликована");
      onCreated(data.story);
      handleReset();
      onClose();
    } catch (err) {
      console.error("Story create failed:", err);
      toast.error("Не удалось опубликовать историю");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCaption("");
    setPreviewUrl(null);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3">
      <div className="relative flex h-full max-h-[680px] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <header className="flex h-12 items-center gap-2 border-b border-border px-3">
          <Camera className="h-5 w-5 text-primary" />
          <h2 className="flex-1 text-base font-semibold">Новая история</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label="Закрыть"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border transition-colors",
                "hover:border-primary/60 hover:bg-accent/40",
              )}
            >
              <ImagePlus className="h-12 w-12 text-muted-foreground" />
              <span className="text-sm font-medium">Выберите фото или видео</span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WEBP, GIF, MP4, WEBM · до 25 МБ
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black">
                {isVideo ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={previewUrl ?? undefined}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl ?? undefined}
                    alt="Предпросмотр"
                    className="h-full w-full object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={uploading}
                  aria-label="Удалить"
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Подпись (необязательно)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Что у вас нового?"
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="mt-1 text-right text-[10px] text-muted-foreground">
                  {caption.length}/500
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={uploading}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            Отмена
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Опубликовать
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
