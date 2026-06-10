"use client";

import * as React from "react";
import { Zap, Plus, Trash2, Loader2, Copy } from "lucide-react";
import { toast } from "@/store/toast-store";

interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
}

interface QuickReplyPanelProps {
  onSelect?: (content: string) => void;
}

export function QuickReplyPanel({ onSelect }: QuickReplyPanelProps) {
  const [replies, setReplies] = React.useState<QuickReply[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [shortcut, setShortcut] = React.useState("");
  const [content, setContent] = React.useState("");
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/quick-replies", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setReplies(d.quickReplies ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!shortcut.trim() || !content.trim()) return;
    try {
      const res = await fetch("/api/users/me/quick-replies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortcut: shortcut.trim(), content: content.trim() }),
      });
      if (res.ok) {
        toast.success("Шаблон создан");
        setShortcut("");
        setContent("");
        setAdding(false);
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === "shortcut_already_exists") toast.error("Шорткод уже существует");
        else toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch("/api/users/me/quick-replies", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Шаблон удалён");
        load();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setDeleting(null);
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Быстрые ответы</h3>
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" /> Создать
        </button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <input
            type="text"
            placeholder="Шорткод (напр. /привет)"
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value)}
            maxLength={50}
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
          />
          <textarea
            placeholder="Текст шаблона"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!shortcut.trim() || !content.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setShortcut(""); setContent(""); }}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {replies.length === 0 && !adding && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Нет шаблонов. Создайте первый быстрый ответ.
        </p>
      )}

      <div className="space-y-1">
        {replies.map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-border p-2.5 hover:bg-accent/50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono font-medium text-primary">{r.shortcut}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.content}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect ? onSelect(r.content) : copyContent(r.content)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Вставить"
              >
                {onSelect ? <Zap className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
                className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {deleting === r.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
