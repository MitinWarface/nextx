"use client";

import * as React from "react";
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, Send, ChevronLeft, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface TicketMessage {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null; role: string };
}

interface Ticket {
  id: string;
  ticketNum: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  messageCount: number;
  lastReplyAt: string;
  createdAt: string;
  messages: TicketMessage[];
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  open: { icon: <Clock className="h-3.5 w-3.5" />, label: "Открыт", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />, label: "В работе", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  waiting: { icon: <Clock className="h-3.5 w-3.5" />, label: "Ожидание", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  resolved: { icon: <CheckCircle className="h-3.5 w-3.5" />, label: "Решён", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  closed: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Закрыт", color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800/50" },
};

const STATUS_FILTERS = ["all", "open", "in_progress", "waiting", "resolved", "closed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Все",
  open: "Открытые",
  in_progress: "В работе",
  waiting: "Ожидание",
  resolved: "Решённые",
  closed: "Закрытые",
};

const CATEGORIES: Record<string, string> = {
  technical: "Техническая поддержка",
  billing: "Оплата",
  feature_request: "Запрос функции",
  bug: "Ошибка",
  other: "Другое",
};

const PRIORITIES: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-orange-500",
  urgent: "text-red-500",
};

const isSupport = (role: string) =>
  ["ADMIN", "SUPER_ADMIN", "SUPPORT_LEAD", "SUPPORT", "MODERATOR", "SENIOR_MODERATOR"].includes(role);

export default function SupportPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Ticket | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newSubject, setNewSubject] = React.useState("");
  const [newMessage, setNewMessage] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("technical");
  const [newPriority, setNewPriority] = React.useState("normal");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [closingTicket, setClosingTicket] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const fetchTickets = React.useCallback(async () => {
    try {
      const res = await fetch("/api/support", { credentials: "include" });
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  React.useEffect(() => { fetchTickets(); }, [fetchTickets]);

  React.useEffect(() => {
    if (selected) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selected?.messages?.length]);

  const filteredTickets = React.useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: tickets.length };
    for (const t of tickets) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [tickets]);

  const handleCreate = async () => {
    if (!newSubject.trim() || !newMessage.trim()) { toast.error("Заполните все поля"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: newSubject, message: newMessage, category: newCategory, priority: newPriority }),
      });
      if (res.ok) {
        toast.success("Обращение создано");
        setNewSubject(""); setNewMessage(""); setCreating(false);
        fetchTickets();
      } else {
        toast.error("Ошибка создания");
      }
    } catch { toast.error("Ошибка сети"); } finally { setCreating(false); }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        const detail = await fetch(`/api/support/${selected.id}`, { credentials: "include" }).then((r) => r.json());
        setSelected(detail.ticket);
        fetchTickets();
      }
    } catch { toast.error("Ошибка отправки"); } finally { setSending(false); }
  };

  const handleCloseTicket = async () => {
    if (!selected) return;
    setClosingTicket(true);
    try {
      const res = await fetch(`/api/support/${selected.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) {
        toast.success("Обращение закрыто");
        setSelected({ ...selected, status: "closed" });
        fetchTickets();
      } else {
        toast.error("Ошибка закрытия");
      }
    } catch { toast.error("Ошибка сети"); } finally { setClosingTicket(false); }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {selected && (
            <button type="button" onClick={() => setSelected(null)} className="rounded-md p-1 hover:bg-accent">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <MessageSquare className="h-5 w-5" />
          <h1 className="text-lg font-semibold">{selected ? `#${selected.ticketNum} ${selected.subject}` : "Поддержка"}</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="p-4">
            <div className="mb-4 rounded-lg border border-border p-4">
              <h2 className="mb-2 text-sm font-medium">Новое обращение</h2>
              <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Тема" className="mb-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
              <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Опишите проблему..." rows={3} className="mb-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none" />
              <div className="mb-2 flex gap-2">
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="rounded-md border border-input bg-transparent px-2 py-2 text-sm">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="rounded-md border border-input bg-transparent px-2 py-2 text-sm">
                  {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <button type="button" onClick={handleCreate} disabled={creating || !newSubject.trim() || !newMessage.trim()} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {creating ? "Создание..." : "Создать обращение"}
              </button>
            </div>

            {/* Status filter tabs */}
            <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((s) => {
                const count = statusCounts[s] || 0;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      statusFilter === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {STATUS_FILTER_LABELS[s]}
                    {count > 0 && (
                      <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/20 px-1 text-[10px]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
            ) : filteredTickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {statusFilter === "all" ? "Нет обращений" : "Нет обращений с этим статусом"}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredTickets.map((t) => {
                  const st = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.open;
                  return (
                    <button key={t.id} type="button" onClick={() => setSelected(t)} className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{t.ticketNum}</span>
                          <span className="font-medium">{t.subject}</span>
                        </div>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", st.bg, st.color)}>
                          {st.icon}
                          {st.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{CATEGORIES[t.category] ?? t.category}</span>
                        <span className={PRIORITY_COLORS[t.priority]}>{PRIORITIES[t.priority] ?? t.priority}</span>
                        <span>{t.messageCount} сообщений</span>
                        <span>{new Date(t.createdAt).toLocaleDateString("ru-RU")}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col p-4">
            {/* Ticket info bar */}
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
              {(() => {
                const st = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.open;
                return (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", st.bg, st.color)}>
                    {st.icon}
                    {st.label}
                  </span>
                );
              })()}
              <span className="text-xs text-muted-foreground">{CATEGORIES[selected.category]}</span>
              <span className={cn("text-xs", PRIORITY_COLORS[selected.priority])}>{PRIORITIES[selected.priority]}</span>
              <span className="text-xs text-muted-foreground">{selected.messageCount} сообщений</span>
              {selected.status !== "closed" && selected.status !== "resolved" && (
                <button
                  type="button"
                  onClick={handleCloseTicket}
                  disabled={closingTicket}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  <XCircle className="h-3 w-3" />
                  {closingTicket ? "Закрытие..." : "Закрыть"}
                </button>
              )}
            </div>

            <div className="flex-1 space-y-3">
              {selected.messages.map((m) => {
                const agentRole = isSupport(m.sender.role);
                return (
                  <div key={m.id} className={cn("rounded-lg border p-3", m.isInternal ? "border-yellow-500/30 bg-yellow-500/5" : agentRole ? "border-blue-500/30 bg-blue-500/5" : "border-border")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.sender.displayName}</span>
                        {agentRole && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            Поддержка
                          </span>
                        )}
                        {m.isInternal && (
                          <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Внутренняя заметка
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("ru-RU")}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{m.content}</p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            {selected.status !== "closed" && (
              <div className="mt-4 flex gap-2">
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()} placeholder="Ответить..." className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                <button type="button" onClick={handleReply} disabled={sending || !replyText.trim()} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
            {selected.status === "closed" && (
              <p className="mt-4 text-center text-sm text-muted-foreground">Обращение закрыто</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
