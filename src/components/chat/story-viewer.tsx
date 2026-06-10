"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, MoreVertical, Trash2, Loader2, Send, Reply, Bookmark, BookmarkMinus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";
import type { StoryGroup } from "./stories-bar";

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroupIdx: number;
  myUserId: string;
  onClose: () => void;
  onDelete: (storyId: string) => void;
  onOpenChat?: (chatId: string) => void;
  onHighlightChange?: (storyId: string, name: string | null) => void;
}

const STORY_DURATION_MS = 5_000;
const VIDEO_STORY_DURATION_MS = 15_000;

export function StoryViewer({
  groups,
  startGroupIdx,
  myUserId,
  onClose,
  onDelete,
  onOpenChat,
  onHighlightChange,
}: StoryViewerProps) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [groupIdx, setGroupIdx] = React.useState(startGroupIdx);
  const [storyIdx, setStoryIdx] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [sendingReply, setSendingReply] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const startedAtRef = React.useRef<number>(Date.now());
  const reportedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => setMounted(true), []);

  const currentGroup = groups[groupIdx];
  const currentStory = currentGroup?.stories[storyIdx];
  const isMine = currentStory?.author.id === myUserId;
  const isVideo = currentStory?.mediaType === "VIDEO";
  const duration = isVideo ? VIDEO_STORY_DURATION_MS : STORY_DURATION_MS;

  // Mark viewed on first appearance
  React.useEffect(() => {
    if (!currentStory) return;
    if (currentStory.viewedByMe || reportedRef.current.has(currentStory.id)) return;
    reportedRef.current.add(currentStory.id);
    void fetch(`/api/stories/${currentStory.id}/view`, { method: "POST" }).catch(
      () => undefined,
    );
  }, [currentStory]);

  // Reset progress + start timer when story changes
  React.useEffect(() => {
    startedAtRef.current = Date.now();
    setProgress(0);
    setMenuOpen(false);
    setReplyText("");
  }, [groupIdx, storyIdx]);

  const handleToggleHighlight = async () => {
    if (!currentStory || !isMine) return;
    setMenuOpen(false);
    const isHighlighted = Boolean(currentStory.highlightName);
    try {
      if (isHighlighted) {
        const res = await fetch(`/api/stories/${currentStory.id}/highlight`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        onHighlightChange?.(currentStory.id, null);
        toast.success("Убрано из highlights");
      } else {
        const res = await fetch(`/api/stories/${currentStory.id}/highlight`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Highlights" }),
        });
        if (!res.ok) throw new Error();
        onHighlightChange?.(currentStory.id, "Highlights");
        toast.success("Сохранено в highlights");
      }
    } catch {
      toast.error("Не удалось обновить");
    }
  };

  const handleSendReply = async () => {
    if (!currentStory || sendingReply) return;
    const text = replyText.trim();
    if (!text) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.error(data?.error ?? "Не удалось отправить");
        return;
      }
      const data = (await res.json()) as { chatId: string };
      toast.success("Ответ отправлен");
      setReplyText("");
      onClose();
      if (onOpenChat) {
        onOpenChat(data.chatId);
      } else {
        router.push(`/?chat=${data.chatId}`);
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSendingReply(false);
    }
  };

  // Progress animation
  React.useEffect(() => {
    if (!currentStory || paused) return;
    if (isVideo && videoRef.current) {
      const v = videoRef.current;
      v.currentTime = 0;
      void v.play().catch(() => undefined);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p >= 1) {
        next();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx, paused, currentStory?.id]);

  // When unpausing, adjust startedAt to account for paused time
  const pausedAtRef = React.useRef(0);
  React.useEffect(() => {
    if (paused) {
      pausedAtRef.current = Date.now();
    } else if (pausedAtRef.current > 0) {
      // Shift startedAt forward by how long we were paused
      startedAtRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = 0;
    }
  }, [paused]);

  const go = React.useCallback(
    (delta: number) => {
      if (!currentGroup) return;
      const newStoryIdx = storyIdx + delta;
      if (newStoryIdx >= 0 && newStoryIdx < currentGroup.stories.length) {
        setStoryIdx(newStoryIdx);
        return;
      }
      const newGroupIdx = groupIdx + (delta > 0 ? 1 : -1);
      if (newGroupIdx < 0 || newGroupIdx >= groups.length) {
        onClose();
        return;
      }
      setGroupIdx(newGroupIdx);
      setStoryIdx(0);
    },
    [groupIdx, storyIdx, currentGroup, groups.length, onClose],
  );

  const next = React.useCallback(() => go(1), [go]);
  const prev = React.useCallback(() => go(-1), [go]);

  // Keyboard
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const handleDelete = async () => {
    if (!currentStory) return;
    const id = currentStory.id;
    try {
      const res = await fetch(`/api/stories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      toast.success("История удалена");
      onDelete(id);
      // advance to next
      const newGroup = {
        ...currentGroup,
        stories: currentGroup.stories.filter((s) => s.id !== id),
      };
      if (newGroup.stories.length === 0) {
        onClose();
      } else {
        if (storyIdx >= newGroup.stories.length) {
          setStoryIdx(newGroup.stories.length - 1);
        }
      }
    } catch {
      toast.error("Не удалось удалить историю");
    }
  };

  if (!mounted || !currentStory || !currentGroup) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-black/95"
      onClick={() => setPaused((p) => !p)}
    >
      {/* Progress bars */}
      <div className="flex gap-1 p-2">
        {currentGroup.stories.map((s, i) => (
          <div
            key={s.id}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
          >
            <div
              className="h-full bg-white transition-[width] duration-100 ease-linear"
              style={{
                width:
                  i < storyIdx
                    ? "100%"
                    : i === storyIdx
                      ? `${progress * 100}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <header
        className="flex items-center gap-2 px-3 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Avatar
          name={currentStory.author.displayName}
          src={currentStory.author.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {currentStory.author.displayName}
          </div>
          <div className="text-[11px] text-white/70">
            {new Date(currentStory.createdAt).toLocaleString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        {isMine && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Меню"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/20"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-10 w-56 overflow-hidden rounded-xl bg-card text-card-foreground shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    void handleToggleHighlight();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {currentStory.highlightName ? (
                    <>
                      <BookmarkMinus className="h-4 w-4" />
                      Убрать из highlights
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4" />
                      Сохранить в highlights
                    </>
                  )}
                </button>
                <div className="h-px bg-border" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Закрыть"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Media */}
      <div
        className="relative flex flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {currentStory.mediaType === "VIDEO" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="max-h-full max-w-full"
            playsInline
            onEnded={next}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (!v.duration) return;
              setProgress(v.currentTime / v.duration);
            }}
            onClick={(e) => {
              e.stopPropagation();
              const el = e.currentTarget;
              if (el.paused) void el.play();
              else el.pause();
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentStory.mediaUrl}
            alt={currentStory.caption ?? "story"}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        )}

        {/* Tap zones */}
        <button
          type="button"
          aria-label="Предыдущая"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-0 top-0 h-full w-1/3"
        />
        <button
          type="button"
          aria-label="Следующая"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-0 top-0 h-full w-1/3"
        />
      </div>

      {/* Caption */}
      {currentStory.caption && (
        <div
          className="px-4 pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto max-w-md rounded-2xl bg-black/60 px-4 py-2 text-center text-sm text-white">
            {currentStory.caption}
          </div>
        </div>
      )}

      {/* Reply input (only for stories not authored by me) */}
      {!isMine && currentStory && (
        <div
          className="border-t border-white/10 bg-black/60 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendReply();
            }}
            className="flex items-center gap-2"
          >
            <Reply className="h-4 w-4 text-white/60" />
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Ответить ${currentStory.author.displayName}…`}
              maxLength={500}
              disabled={sendingReply}
              className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sendingReply || !replyText.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:brightness-110 disabled:opacity-40"
              aria-label="Отправить"
            >
              {sendingReply ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Navigation arrows */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
        <button
          type="button"
          aria-label="Назад"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className={cn(
            "pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 transition-opacity hover:bg-black/60",
            groupIdx === 0 && storyIdx === 0 && "opacity-30",
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Вперёд"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className={cn(
            "pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 transition-opacity hover:bg-black/60",
            groupIdx === groups.length - 1 &&
              storyIdx === (groups[groups.length - 1]?.stories.length ?? 1) - 1 &&
              "opacity-30",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Loader overlay (only if no story) */}
      {!currentStory && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
    </div>,
    document.body,
  );
}
