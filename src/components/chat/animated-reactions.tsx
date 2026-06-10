"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ReactionSummary } from "@/types";

/**
 * Animated reaction bar — each reaction chip has a pop-in animation
 * when the count changes.
 */
export function AnimatedReactionBar({
  reactions,
  myUserId,
  isOutgoing,
  onToggle,
}: {
  reactions: ReactionSummary[];
  myUserId?: string;
  isOutgoing: boolean;
  onToggle: (emoji: string) => void;
}) {
  if (reactions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 px-1.5 pb-1",
        isOutgoing ? "justify-end" : "justify-start",
      )}
    >
      {reactions.map((r) => {
        const mine = myUserId ? r.userIds.includes(myUserId) : false;
        return (
          <ReactionChip
            key={r.emoji}
            emoji={r.emoji}
            count={r.count}
            mine={mine}
            onClick={() => onToggle(r.emoji)}
          />
        );
      })}
    </div>
  );
}

function ReactionChip({
  emoji,
  count,
  mine,
  onClick,
}: {
  emoji: string;
  count: number;
  mine: boolean;
  onClick: () => void;
}) {
  const [animating, setAnimating] = React.useState(false);
  const prevCountRef = React.useRef(count);

  React.useEffect(() => {
    if (prevCountRef.current !== count) {
      setAnimating(true);
      prevCountRef.current = count;
      const t = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-all",
        mine
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-card/80 text-foreground/80 hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "text-[13px] leading-none transition-transform",
          animating && "animate-reaction-pop",
        )}
      >
        {emoji}
      </span>
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  );
}
