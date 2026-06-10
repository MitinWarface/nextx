"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Trash2, Clock, CalendarClock, Loader2 } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface ScheduledMessage {
  id: string;
  chatId: string;
  content: string;
  type: string;
  scheduledFor: string;
  createdAt: string;
}

interface ScheduledQueueModalProps {
  open: boolean;
  onClose: () => void;
}

export function ScheduledQueueModal({ open, onClose }: ScheduledQueueModalProps) {
  const [messages, setMessages] = React.useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const fetchScheduled = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduled", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) fetchScheduled();
  }, [open, fetchScheduled]);

  const handleCancel = React.useCallback(async (messageId: string) => {
    setDeleting(messageId);
    try {
      const res = await fetch(`/api/scheduled/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        toast.success("Запланированное сообщение отменено");
      } else {
        toast.error("Не удалось отменить");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setDeleting(null);
    }
  }, []);

  if (!open) return null;

  const portalNode = typeof document !== "undefined" ? document.body : null;
  if (!portalNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Очередь публикаций</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Нет запланированных сообщений
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages.map((msg) => {
                const scheduledDate = new Date(msg.scheduledFor);
                const isPast = scheduledDate <= new Date();
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                      isPast && "opacity-50",
                    )}
                  >
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm">{msg.content}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {scheduledDate.toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          в {formatTime(scheduledDate)}
                        </span>
                        <span className="text-border">•</span>
                        <span>{msg.type}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCancel(msg.id)}
                      disabled={deleting === msg.id}
                      className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      title="Отменить"
                    >
                      {deleting === msg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {messages.length} {messages.length === 1 ? "сообщение" : "сообщений"} в очереди
        </div>
      </div>
    </div>,
    portalNode,
  );
}
