"use client";

import * as React from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToBottomButtonProps {
  visible: boolean;
  count: number;
  onClick: () => void;
  className?: string;
}

export function ScrollToBottomButton({
  visible,
  count,
  onClick,
  className,
}: ScrollToBottomButtonProps) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Прокрутить вниз"
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-foreground shadow-telegram transition-all",
        "hover:bg-accent active:scale-95",
        "animate-in fade-in-0 slide-in-from-bottom-2",
        className,
      )}
    >
      <ArrowDown className="h-4 w-4" />
      {count > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
