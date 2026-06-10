"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface AiSearchToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function AiSearchToggle({
  enabled,
  onToggle,
  disabled = false,
  className,
}: AiSearchToggleProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="AI поиск"
        disabled={disabled}
        onClick={() => onToggle(!enabled)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          enabled ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
            enabled ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
      {enabled && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          AI
        </span>
      )}
    </div>
  );
}
