"use client";

import * as React from "react";
import { X, Trash2, RotateCcw } from "lucide-react";
import { toast } from "@/store/toast-store";

interface TrashMessage {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  type: string;
  createdAt: string;
  chatName: string;
  chatId: string;
  senderName: string;
}

interface TrashModalProps {
  open: boolean;
  onClose: () => void;
}

export function TrashModal({ open, onClose }: TrashModalProps) {
  const [messages, setMessages] = React.useState<TrashMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [restoring, setRestoring] = React.useState<string | null>(null);

  const load = React.useCallback(async (c?: string | null) => {
    setLoading(true);
    try {
      const url = c ? `/api/messages/trash?cursor=${encodeURIComponent(c)}` : "/api/messages/trash";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => c ? [...prev, ...data.messages] : data.messages);
        setCursor(data.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { if (open) { setMessages([]); load(); } }, [open, load]);

  const restore = async (msgId: string) => {
    setRestoring(msgId);
    try {
      const res = await fetch(`/api/messages/trash/${msgId}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Сообщение восстановлено");
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      } else {
        toast.error("Ошибка");
      }
    } finally {
      setRestoring(null);
    }
  };

  const permanentlyDelete = async (msgId: string) => {
    if (!confirm("Удалить безвозвратно?")) return;
    try {
      const res = await fetch(`/api/messages/trash/${msgId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Удалено");
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[70vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Корзина</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Корзина пуста</div>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">{m.senderName} → {m.chatName}</p>
                      <p className="mt-0.5 truncate text-sm">{m.content ?? "[Медиа]"}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => restore(m.id)} disabled={restoring === m.id}
                        className="rounded-md p-1.5 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50" title="Восстановить">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => permanentlyDelete(m.id)}
                        className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" title="Удалить навсегда">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {cursor && (
                <button type="button" onClick={() => load(cursor)} className="w-full rounded-md border border-border py-2 text-sm hover:bg-accent">
                  Загрузить ещё
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
