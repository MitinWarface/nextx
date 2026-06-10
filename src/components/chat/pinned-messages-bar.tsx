"use client";

import * as React from "react";
import { Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageDTO } from "@/types";

interface PinnedMessagesBarProps {
  pinned: MessageDTO[];
  onJump: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  className?: string;
}

export function PinnedMessagesBar({
  pinned,
  onJump,
  onUnpin,
  className,
}: PinnedMessagesBarProps) {
  const [index, setIndex] = React.useState(0);

  // Следим за сменой pin-набора — сбрасываем индекс
  React.useEffect(() => {
    if (index >= pinned.length) {
      setIndex(Math.max(0, pinned.length - 1));
    }
  }, [pinned.length, index]);

  if (pinned.length === 0) return null;
  const current = pinned[index];
  if (!current) return null;

  const excerpt = current.content
    ? current.content
    : current.type === "IMAGE"
      ? "📷 Фото"
      : current.type === "VIDEO"
        ? "🎥 Видео"
        : current.type === "AUDIO"
          ? "🎵 Аудио"
          : current.type === "VOICE"
            ? "🎤 Голосовое"
            : current.type === "FILE"
              ? `📎 ${current.fileName ?? "Файл"}`
              : "Вложение";

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-1.5",
        className,
      )}
    >
      <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <button
        type="button"
        onClick={() => onJump(current.id)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
          <span className="truncate">
            Закреплено
            {pinned.length > 1 && (
              <span className="text-muted-foreground">
                {" "}
                · {index + 1}/{pinned.length}
              </span>
            )}
          </span>
          {current.sender && (
            <span className="text-muted-foreground">
              · {current.sender.displayName}
            </span>
          )}
        </div>
        <p className="line-clamp-1 text-[12.5px] text-foreground/85">
          {excerpt}
        </p>
      </button>

      {pinned.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setIndex((i) => (i - 1 + pinned.length) % pinned.length)
            }
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Предыдущее"
            title="Предыдущее"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % pinned.length)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Следующее"
            title="Следующее"
          >
            ›
          </button>
        </>
      )}

      {onUnpin && (
        <button
          type="button"
          onClick={() => onUnpin(current.id)}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Открепить"
          title="Открепить"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
