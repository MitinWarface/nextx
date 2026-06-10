"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Users, Megaphone, CheckSquare, CalendarDays, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickCreateMenuProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewChannel: () => void;
  onNewTask: () => void;
  onNewEvent: () => void;
  onNewReminder: () => void;
}

interface QuickOption {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export function QuickCreateMenu({
  open,
  onClose,
  onNewChat,
  onNewGroup,
  onNewChannel,
  onNewTask,
  onNewEvent,
  onNewReminder,
}: QuickCreateMenuProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const options: QuickOption[] = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: "Новый чат",
      onClick: () => { onClose(); onNewChat(); },
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Новая группа",
      onClick: () => { onClose(); onNewGroup(); },
    },
    {
      icon: <Megaphone className="h-4 w-4" />,
      label: "Новый канал",
      onClick: () => { onClose(); onNewChannel(); },
    },
    {
      icon: <CheckSquare className="h-4 w-4" />,
      label: "Новая задача",
      onClick: () => { onClose(); onNewTask(); },
    },
    {
      icon: <CalendarDays className="h-4 w-4" />,
      label: "Новое событие",
      onClick: () => { onClose(); onNewEvent(); },
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Новое напоминание",
      onClick: () => { onClose(); onNewReminder(); },
    },
  ];

  return createPortal(
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[60] transition-opacity duration-200",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/40"
      />
      <div className="absolute left-1/2 top-1/2 w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Создать</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="py-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={opt.onClick}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent/60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {opt.icon}
              </span>
              <span className="flex-1 text-left">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
