"use client";

import * as React from "react";
import { Send, AlertTriangle, Eye, ScrollText } from "lucide-react";
import { toast } from "@/store/toast-store";

interface BroadcastLog {
  id: string;
  serviceType: string;
  content: string;
  sentBy: { username: string; displayName: string };
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  actor?: { username: string; displayName: string };
}

const SERVICE_TYPES = [
  { value: "UPDATE", label: "Обновления" },
  { value: "NEWS", label: "Новости" },
  { value: "SECURITY", label: "Безопасность" },
  { value: "SYSTEM", label: "Система" },
  { value: "SUPPORT", label: "Поддержка" },
];

const SERVICE_COLORS: Record<string, string> = {
  UPDATE: "bg-blue-500/10 text-blue-500",
  NEWS: "bg-emerald-500/10 text-emerald-500",
  SECURITY: "bg-red-500/10 text-red-500",
  SYSTEM: "bg-yellow-500/10 text-yellow-500",
  SUPPORT: "bg-purple-500/10 text-purple-500",
};

export default function AdminBroadcastsPage() {
  const [serviceType, setServiceType] = React.useState("UPDATE");
  const [content, setContent] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [history, setHistory] = React.useState<BroadcastLog[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);
  const [broadcastToAll, setBroadcastToAll] = React.useState(true);
  const [result, setResult] = React.useState<{ sent: number; failed: number } | null>(null);

  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/audit?action=BROADCAST_SEND&limit=10", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const raw: AuditLogEntry[] = data.data?.logs ?? data.logs ?? [];
        setHistory(
          raw.map((log) => ({
            id: log.id,
            serviceType: (log.details as any)?.serviceType ?? "UPDATE",
            content: (log.details as any)?.content ?? "",
            sentBy: log.actor ?? { username: "unknown", displayName: "Unknown" },
            createdAt: log.createdAt,
          })),
        );
      }
    } catch {} finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error("Введите текст рассылки");
      return;
    }
    setSending(true);
    setShowConfirm(false);
    setResult(null);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ serviceType, content: content.trim(), broadcastToAll }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ sent: data.sent, failed: data.failed });
        toast.success(`Отправлено ${data.sent} пользователям, ошибок: ${data.failed}`);
        setContent("");
        loadHistory();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка отправки");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Рассылки</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border p-5">
          <h2 className="font-semibold">Новая рассылка</h2>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Тип сервиса</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Сообщение</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Введите текст рассылки..."
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length} символов
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border p-3">
            <input
              type="checkbox"
              id="broadcastToAll"
              checked={broadcastToAll}
              onChange={(e) => setBroadcastToAll(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="broadcastToAll" className="text-sm font-medium cursor-pointer">
              Отправить всем пользователям
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>Предпросмотр</span>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${SERVICE_COLORS[serviceType]}`}>
                  {SERVICE_TYPES.find((t) => t.value === serviceType)?.label}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">
                {content || <span className="text-muted-foreground italic">Пустое сообщение</span>}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!content.trim()) {
                toast.error("Введите текст рассылки");
                return;
              }
              setShowConfirm(true);
            }}
            disabled={sending || !content.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Отправка..." : broadcastToAll ? "Разослать всем" : "Отправить"}
          </button>

          {result && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p>
                Отправлено <span className="font-medium text-green-600">{result.sent}</span> пользователям
                {result.failed > 0 && (
                  <>,{" "}ошибок: <span className="font-medium text-red-600">{result.failed}</span></>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-border p-5">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Последние рассылки</h2>
          </div>

          {loadingHistory ? (
            <div className="text-center text-muted-foreground py-8">Загрузка...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Нет рассылок</div>
          ) : (
            <div className="space-y-3">
              {history.map((log) => (
                <div
                  key={log.id}
                  className="rounded-md border border-border p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${SERVICE_COLORS[log.serviceType] ?? "bg-muted text-muted-foreground"}`}>
                      {SERVICE_TYPES.find((t) => t.value === log.serviceType)?.label ?? log.serviceType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("ru")}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-3">{log.content}</p>
                  <p className="text-xs text-muted-foreground">от @{log.sentBy.username}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Подтвердите рассылку</h3>
                <p className="text-sm text-muted-foreground">
                  Сообщение будет отправлено во все сервисные чаты
                </p>
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p className="whitespace-pre-wrap">{content}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={sending}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? "Отправка..." : "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
