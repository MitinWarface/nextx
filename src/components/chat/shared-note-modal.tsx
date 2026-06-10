"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Save, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface SharedNoteModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  chatName?: string;
}

export function SharedNoteModal({ open, onClose, chatId, chatName }: SharedNoteModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => setMounted(true), []);

  // Load note on open
  React.useEffect(() => {
    if (!open || !chatId) return;
    setLoading(true);
    fetch(`/api/chats/${chatId}/shared-note`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setContent(d.note?.content ?? "");
        setLastSaved(d.note?.updatedAt ? new Date(d.note.updatedAt) : null);
      })
      .catch(() => toast.error("Не удалось загрузить заметку"))
      .finally(() => setLoading(false));
  }, [open, chatId]);

  // Autosave (debounced 1.5s)
  React.useEffect(() => {
    if (!open || loading) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void handleSave();
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = React.useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/shared-note`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setLastSaved(new Date());
      } else {
        toast.error("Ошибка сохранения");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }, [chatId, content, saving]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3"
      onClick={onClose}
    >
      <div
        className="flex h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">
              Совместная заметка{chatName ? ` — ${chatName}` : ""}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {lastSaved && !saving && (
              <span className="text-[11px] text-muted-foreground">
                Сохранено {lastSaved.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Загрузка...
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Начните писать совместную заметку..."
              className="h-full w-full resize-none border-0 bg-transparent text-sm leading-relaxed focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
            />
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="text-[11px] text-muted-foreground">
            {content.length} символов
          </span>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
