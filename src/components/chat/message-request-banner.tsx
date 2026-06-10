"use client";

import * as React from "react";
import { UserPlus, Check, X, Ban, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface MessageRequestBannerProps {
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatarUrl: string | null;
  onAccepted?: () => void;
  onDismissed?: () => void;
}

export function MessageRequestBanner({
  senderId,
  senderName,
  senderUsername,
  senderAvatarUrl,
  onAccepted,
  onDismissed,
}: MessageRequestBannerProps) {
  const [loading, setLoading] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/me/contacts/${senderId}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast.success(`${senderName} добавлен в контакты`);
        setDismissed(true);
        onAccepted?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === "already_contact" ? "Уже в контактах" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/me/contacts/${senderId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (res.ok) {
        setDismissed(true);
        onDismissed?.();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!confirm(`Заблокировать ${senderName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/me/contacts/${senderId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block" }),
      });
      if (res.ok) {
        toast.success(`${senderName} заблокирован`);
        setDismissed(true);
        onDismissed?.();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <UserPlus className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          Новое сообщение от{" "}
          <span className="font-medium text-foreground">@{senderUsername}</span>
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleAccept}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            loading && "opacity-50",
          )}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Принять
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            loading && "opacity-50",
          )}
        >
          <X className="h-3 w-3" />
          Отклонить
        </button>
        <button
          type="button"
          onClick={handleBlock}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
            "text-destructive hover:bg-destructive/10",
            loading && "opacity-50",
          )}
          title="Заблокировать"
        >
          <Ban className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
