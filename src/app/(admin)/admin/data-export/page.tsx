"use client";

import * as React from "react";
import { Download, RotateCcw, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/store/toast-store";

interface DeletionRequest {
  id: string;
  username: string;
  displayName: string;
  deletedAt: string;
  reason: string;
  daysRemaining: number;
}

interface ExportHistoryEntry {
  id: string;
  target: string;
  admin: string;
  date: string;
  details?: Record<string, unknown>;
}

interface ExportResult {
  export: Record<string, unknown>;
}

export default function DataExportPage() {
  const [deletions, setDeletions] = React.useState<DeletionRequest[]>([]);
  const [history, setHistory] = React.useState<ExportHistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userIdInput, setUserIdInput] = React.useState("");
  const [exporting, setExporting] = React.useState(false);
  const [exportResult, setExportResult] = React.useState<ExportResult | null>(null);
  const [expandedJson, setExpandedJson] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data-export", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDeletions(data.deletionRequests ?? []);
        setHistory(data.exportHistory ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const restoreUser = async (userId: string) => {
    if (!confirm("Восстановить пользователя?")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/restore`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Пользователь восстановлен");
        load();
      } else {
        toast.error("Ошибка восстановления");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const triggerExport = async () => {
    if (!userIdInput.trim()) {
      toast.error("Введите ID пользователя");
      return;
    }
    setExporting(true);
    setExportResult(null);
    try {
      const res = await fetch("/api/admin/data-export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userIdInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setExportResult(data);
        toast.success("Данные выгружены");
        load();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка выгрузки");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Download className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Экспорт данных</h1>
      </div>

      {/* Deletion Requests */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Запросы на удаление</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
        ) : deletions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Нет активных запросов на удаление
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-2">Пользователь</th>
                  <th className="px-4 py-2">Дата запроса</th>
                  <th className="px-4 py-2">Причина</th>
                  <th className="px-4 py-2 text-center">Дней осталось</th>
                  <th className="px-4 py-2 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {deletions.map((d) => (
                  <tr key={d.id} className="border-b border-border/50">
                    <td className="px-4 py-2">
                      <div>
                        <span className="font-medium">{d.displayName}</span>
                        <span className="ml-2 text-muted-foreground">@{d.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(d.deletedAt).toLocaleDateString("ru")}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate">
                      {d.reason}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          d.daysRemaining <= 7
                            ? "bg-red-500/10 text-red-500"
                            : d.daysRemaining <= 14
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-green-500/10 text-green-500"
                        }`}
                      >
                        {d.daysRemaining}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => restoreUser(d.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Восстановить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export History */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">История выгрузок</h2>
        </div>
        {history.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Нет записей о выгрузках
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-2">Дата</th>
                  <th className="px-4 py-2">Администратор</th>
                  <th className="px-4 py-2">Пользователь</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(h.date).toLocaleString("ru")}
                    </td>
                    <td className="px-4 py-2">{h.admin}</td>
                    <td className="px-4 py-2 text-muted-foreground">{h.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Export */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Новая выгрузка</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="ID пользователя"
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={triggerExport}
              disabled={exporting || !userIdInput.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Выгрузка..." : "Выгрузить данные"}
            </button>
          </div>

          {exportResult && (
            <div className="mt-4 rounded-md border border-border">
              <button
                type="button"
                onClick={() => setExpandedJson(!expandedJson)}
                className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium hover:bg-accent/50"
              >
                <span>Результат выгрузки</span>
                {expandedJson ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedJson && (
                <div className="border-t border-border">
                  <pre className="overflow-x-auto p-4 text-xs text-muted-foreground max-h-96">
                    {JSON.stringify(exportResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
