"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Plus, Link2, Copy, Trash2, Phone, Clock, Check, ExternalLink, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

interface CallLinkItem {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  url: string;
  chat: { id: string; name: string; avatarUrl: string | null; type: string } | null;
}

interface CallLinkModalProps {
  open: boolean;
  onClose: () => void;
  onStartCall?: (code: string, kind: "AUDIO" | "VIDEO") => void;
}

export function CallLinkModal({ open, onClose, onStartCall }: CallLinkModalProps) {
  const [links, setLinks] = React.useState<CallLinkItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const fetchLinks = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/call-links", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setLinks(d.links ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) fetchLinks();
  }, [open, fetchLinks]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/call-links", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchLinks();
        toast.success("Ссылка создана");
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Ошибка");
      }
    } catch {} finally {
      setCreating(false);
    }
  };

  const handleCopy = (link: CallLinkItem) => {
    navigator.clipboard.writeText(link.url).then(() => {
      setCopiedId(link.id);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDelete = async (code: string) => {
    try {
      const res = await fetch(`/api/call-links/${code}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await fetchLinks();
        toast.success("Ссылка удалена");
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Ошибка");
      }
    } catch {}
  };

  const isExpired = (expiresAt: string | null) =>
    expiresAt && new Date(expiresAt).getTime() < Date.now();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Ссылки для звонков</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-b border-border px-5 py-3">
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating}
            className="shrink-0"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {creating ? "..." : "Создать ссылку"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : links.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Нет ссылок. Создайте первую, чтобы поделиться ею.
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => {
                const expired = isExpired(link.expiresAt);
                return (
                  <div
                    key={link.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      expired ? "border-border/50 bg-muted/30 opacity-60" : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-mono font-medium">
                            {link.code}
                          </span>
                          {expired && (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                              Истекла
                            </span>
                          )}
                        </div>
                        {link.chat && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Чат: {link.chat.name}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(link.createdAt).toLocaleDateString("ru-RU")}
                          </span>
                          {link.expiresAt && (
                            <span>
                              до {new Date(link.expiresAt).toLocaleDateString("ru-RU")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!expired && (
                          <>
                            <button
                              onClick={() => handleCopy(link)}
                              className="rounded p-1.5 hover:bg-accent"
                              title="Копировать ссылку"
                            >
                              {copiedId === link.id ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            {onStartCall && (
                              <>
                                <button
                                  onClick={() => onStartCall(link.code, "AUDIO")}
                                  className="rounded p-1.5 hover:bg-accent"
                                  title="Аудиозвонок"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => onStartCall(link.code, "VIDEO")}
                                  className="rounded p-1.5 hover:bg-accent"
                                  title="Видеозвонок"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(link.code)}
                              className="rounded p-1.5 hover:bg-destructive/10"
                              title="Удалить"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {!expired && (
                      <div className="mt-2 flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{link.url}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
