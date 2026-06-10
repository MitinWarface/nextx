"use client";

import * as React from "react";
import { ScrollText, Filter, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  target: string | null;
  details: any;
  createdAt: string;
  actor: { id: string; username: string; displayName: string };
}

const ACTION_LABELS: Record<string, string> = {
  USER_BAN: "Бан пользователя",
  USER_UNBAN: "Разбан",
  USER_ROLE_CHANGE: "Смена роли",
  USER_DELETE: "Удаление пользователя",
  CHAT_DELETE: "Удаление чата",
  CHAT_MEMBER_REMOVE: "Кик из чата",
  MESSAGE_DELETE: "Удаление сообщения",
  BOT_CREATE: "Создание бота",
  BOT_DELETE: "Удаление бота",
  SETTINGS_CHANGE: "Изменение настроек",
  BROADCAST_SEND: "Рассылка",
  UPDATE_REMOTE_CONFIG: "Обновление Remote Config",
  DELETE_REMOTE_CONFIG: "Удаление Remote Config",
  CREATE_BUSINESS_ACCOUNT: "Создание бизнес-аккаунта",
  UPDATE_BUSINESS_ACCOUNT: "Обновление бизнес-аккаунта",
  DELETE_BUSINESS_ACCOUNT: "Удаление бизнес-аккаунта",
};

export default function AdminAuditPage() {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [filter, setFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const LIMIT = 30;

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (filter) params.set("action", filter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    fetch(`/api/admin/audit?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.data?.logs ?? d.logs ?? []);
        setTotal(d.data?.total ?? d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, dateFrom, dateTo, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Журнал аудита</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
          >
            <option value="">Все действия</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
            placeholder="От"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
            placeholder="До"
          />
        </div>

        <span className="text-sm text-muted-foreground">Всего: {total}</span>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Загрузка...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">Нет записей</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                <th className="p-3">Время</th>
                <th className="p-3">Админ</th>
                <th className="p-3">Действие</th>
                <th className="p-3">Цель</th>
                <th className="p-3">Детали</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/50">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("ru")}
                  </td>
                  <td className="p-3">
                    <span className="font-medium">@{log.actor.username}</span>
                    <span className="ml-1 text-muted-foreground text-xs">({log.actor.displayName})</span>
                  </td>
                  <td className="p-3">
                    <Badge action={log.action} />
                  </td>
                  <td className="p-3 text-muted-foreground">{log.target ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function Badge({ action }: { action: string }) {
  const label = ACTION_LABELS[action] ?? action;
  const color = action.includes("DELETE") || action.includes("BAN")
    ? "bg-red-500/10 text-red-500"
    : action.includes("ROLE")
    ? "bg-yellow-500/10 text-yellow-500"
    : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${color}`}>
      {label}
    </span>
  );
}
