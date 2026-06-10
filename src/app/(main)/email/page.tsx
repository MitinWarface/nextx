"use client";

import * as React from "react";
import {
  Mail,
  Send,
  Inbox,
  ArrowLeft,
  Search,
  Trash2,
  X,
  Loader2,
  MailOpen,
  Reply,
} from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

interface EmailUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Email {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  from: EmailUser;
  to: EmailUser | null;
}

export default function EmailPage() {
  const [tab, setTab] = React.useState<"inbox" | "sent">("inbox");
  const [emails, setEmails] = React.useState<Email[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [selectedEmail, setSelectedEmail] = React.useState<Email | null>(null);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const loadEmails = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/email?folder=${tab}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  React.useEffect(() => { loadEmails(); }, [loadEmails]);

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead && tab === "inbox") {
      try {
        await fetch(`/api/email/${email.id}`, { credentials: "include" });
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }
  };

  const handleDelete = async (emailId: string) => {
    try {
      const res = await fetch(`/api/email/${emailId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setEmails((prev) => prev.filter((e) => e.id !== emailId));
        setSelectedEmail(null);
        toast.success("Удалено");
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  const handleSend = async (to: string, subject: string, body: string) => {
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      if (res.ok) {
        toast.success("Письмо отправлено");
        setComposeOpen(false);
        if (tab === "sent") loadEmails();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === "recipient_not_found" ? "Получатель не найден" : "Ошибка отправки");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const filteredEmails = emails.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.subject.toLowerCase().includes(q) ||
      e.body.toLowerCase().includes(q) ||
      e.from.displayName.toLowerCase().includes(q) ||
      e.from.username.toLowerCase().includes(q)
    );
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
  };

  if (selectedEmail) {
    return (
      <div className="flex h-full flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setSelectedEmail(null)}
            className="rounded-md p-1.5 hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-sm font-semibold">{selectedEmail.subject}</h2>
            <p className="text-xs text-muted-foreground">
              {tab === "inbox" ? `От: ${selectedEmail.from.displayName} (@${selectedEmail.from.username})` : `Кому: ${selectedEmail.to?.displayName ?? "—"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(selectedEmail.id)}
            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {selectedEmail.from.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{selectedEmail.from.displayName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(selectedEmail.createdAt)}</p>
            </div>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{selectedEmail.body}</div>
        </div>

        {tab === "inbox" && (
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={() => {
                setSelectedEmail(null);
                setComposeOpen(true);
              }}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Reply className="h-4 w-4" />
              Ответить
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Почта</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {unreadCount}
            </span>
          )}
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => setTab("inbox")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "inbox" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
              )}
            >
              Входящие
            </button>
            <button
              type="button"
              onClick={() => setTab("sent")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "sent" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
              )}
            >
              Отправленные
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск писем..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">{searchQuery ? "Ничего не найдено" : "Нет писем"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEmails.map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => handleSelectEmail(email)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                  !email.isRead && "bg-primary/5"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(tab === "inbox" ? email.from : email.to)?.displayName?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn("truncate text-sm", !email.isRead && "font-semibold")}>
                      {tab === "inbox" ? email.from.displayName : email.to?.displayName ?? "—"}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(email.createdAt)}
                    </span>
                  </div>
                  <p className={cn("truncate text-sm", !email.isRead && "font-medium")}>
                    {email.subject}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {email.body.substring(0, 80)}
                  </p>
                </div>
                {!email.isRead && tab === "inbox" && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {composeOpen && (
        <ComposeModal onClose={() => setComposeOpen(false)} onSend={handleSend} />
      )}
    </div>
  );
}

function ComposeModal({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => void;
}) {
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error("Заполните все поля");
      return;
    }
    setSending(true);
    await onSend(to.trim(), subject.trim(), body.trim());
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Новое письмо</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Кому</label>
            <input
              type="text"
              placeholder="username или email@nextx.app"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Тема</label>
            <input
              type="text"
              placeholder="Тема письма"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Текст</label>
            <textarea
              placeholder="Напишите сообщение..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
