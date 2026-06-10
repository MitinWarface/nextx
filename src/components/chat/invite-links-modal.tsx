"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Plus, Link2, Copy, Trash2, Users, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

interface InviteLink {
  id: string;
  code: string;
  name: string | null;
  usesCount: number;
  maxUses: number | null;
  isActive: boolean;
  isRevoked: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdById: string;
}

interface InviteLinksModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
}

export function InviteLinksModal({ open, onClose, chatId }: InviteLinksModalProps) {
  const [links, setLinks] = React.useState<InviteLink[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const fetchLinks = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/invite-links`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setLinks(d.links ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [chatId]);

  React.useEffect(() => {
    if (open) fetchLinks();
  }, [open, fetchLinks]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/invite-links`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() || undefined }),
      });
      if (res.ok) {
        setNewName("");
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

  const handleCopy = (link: InviteLink) => {
    const url = `${window.location.origin}/invite/${link.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(link.id);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDeactivate = async (linkId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/invite-links/${linkId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await fetchLinks();
        toast.success("Ссылка деактивирована");
      }
    } catch {}
  };

  const getInviteUrl = (code: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${code}`;

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Ссылки-приглашения</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Create form */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Input
            placeholder="Название (необязательно)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating}
            className="shrink-0"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {creating ? "..." : "Создать"}
          </Button>
        </div>

        {/* Links list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : links.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Нет ссылок. Создайте первую.
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => {
                const active = link.isActive && !link.isRevoked;
                return (
                  <div
                    key={link.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">
                            {link.name || "Без названия"}
                          </span>
                          {!active && (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                              Неактивна
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {link.usesCount}
                            {link.maxUses != null && ` / ${link.maxUses}`}
                          </span>
                          <span>
                            {new Date(link.createdAt).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {active && (
                          <>
                            <button
                              onClick={() => handleCopy(link)}
                              className="rounded p-1.5 hover:bg-accent"
                              title="Копировать"
                            >
                              {copiedId === link.id ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeactivate(link.id)}
                              className="rounded p-1.5 hover:bg-destructive/10"
                              title="Деактивировать"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {active && (
                      <div className="mt-2 flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{getInviteUrl(link.code)}</span>
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
