"use client";

import * as React from "react";
import { Clock, BellOff, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface MuteByTimeProps {
  isMuted: boolean;
  onToggle: (muted: boolean, durationMinutes?: number) => void;
  className?: string;
}

const MUTE_OPTIONS = [
  { label: "1 час", minutes: 60 },
  { label: "8 часов", minutes: 480 },
  { label: "2 дня", minutes: 2880 },
  { label: "30 дней", minutes: 43200 },
  { label: "Навсегда", minutes: undefined },
];

export function MuteByTime({ isMuted, onToggle, className }: MuteByTimeProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors",
          isMuted
            ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "hover:bg-accent",
        )}
      >
        {isMuted ? (
          <BellOff className="h-4 w-4 shrink-0" />
        ) : (
          <Bell className="h-4 w-4 shrink-0" />
        )}
        <span className="flex-1 text-left">
          {isMuted ? "Убрать тишину" : "Без звука"}
        </span>
        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
          {MUTE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                onToggle(!isMuted, opt.minutes);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors hover:bg-accent"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
