"use client";

import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchedulePickerProps {
  scheduledFor: string | null;
  onSchedule: (iso: string | null) => void;
  className?: string;
}

export function SchedulePicker({ scheduledFor, onSchedule, className }: SchedulePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
          scheduledFor
            ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        title="Запланировать"
      >
        <Clock className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-30 w-[260px] rounded-lg border border-border bg-card p-3 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium">Запланировать отправку</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <input
            type="datetime-local"
            value={scheduledFor ?? ""}
            onChange={(e) => onSchedule(e.target.value || null)}
            className="mb-2 w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
            min={new Date().toISOString().slice(0, 16)}
          />
          {scheduledFor && (
            <p className="mb-2 text-[11px] text-muted-foreground">
              Отправка: {new Date(scheduledFor).toLocaleString("ru-RU")}
            </p>
          )}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSchedule(null);
              }}
              className="flex-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
