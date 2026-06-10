"use client";

import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

interface NotificationToggleProps {
  activeChatId: string | null;
}

export function NotificationToggle({ activeChatId }: NotificationToggleProps) {
  const { enabled, permission, setEnabled, requestPermission, supported } =
    useNotifications(activeChatId);
  const [pending, setPending] = React.useState(false);

  if (!supported) {
    return (
      <div className="flex w-full items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Уведомления не поддерживаются</span>
      </div>
    );
  }

  const onToggle = async () => {
    if (pending) return;
    if (enabled) {
      setEnabled(false);
      return;
    }
    setPending(true);
    try {
      const result = await requestPermission();
      if (result !== "granted") {
        // Ничего не делаем — пользователь отказал
      }
    } finally {
      setPending(false);
    }
  };

  let statusLabel = "Включены";
  if (permission === "denied") statusLabel = "Заблокированы в браузере";
  else if (permission === "default" && !enabled) statusLabel = "Выключены";
  else if (permission === "default") statusLabel = "Нужен запрос";
  else if (enabled) statusLabel = "Включены";
  else statusLabel = "Выключены";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending || permission === "denied"}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
      )}
      role="switch"
      aria-checked={enabled}
      title={
        permission === "denied"
          ? "Разблокируйте уведомления в настройках браузера"
          : undefined
      }
    >
      <span className="text-muted-foreground">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : enabled ? (
          <Bell className="h-4 w-4 text-primary" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
      </span>
      <div className="flex flex-1 flex-col items-start">
        <span>Уведомления</span>
        <span className="text-[10.5px] text-muted-foreground">
          {statusLabel}
        </span>
      </div>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
          enabled
            ? "bg-primary/90"
            : "bg-muted-foreground/25",
          permission === "denied" && "opacity-50",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-out",
            enabled ? "translate-x-[18px]" : "translate-x-[2px]",
          )}
        />
      </span>
    </button>
  );
}
