"use client";

import * as React from "react";
import { Brain, AlertTriangle, TrendingUp, Users, RefreshCw } from "lucide-react";

interface AiData {
  totalRequests: number;
  requestsToday: number;
  requestsWeek: number;
  failedRequests: number;
  totalTokens: number;
  avgTokens: number;
  byType: Array<{ type: string; count: number; tokens: number }>;
  byModel: Array<{ model: string; count: number; tokens: number }>;
  byDay: Array<{ date: string; count: number; tokens: number }>;
  topUsers: Array<{ userId: string; username: string; displayName: string; count: number; tokens: number }>;
}

const TYPE_LABELS: Record<string, string> = {
  rewrite: "AI Rewrite",
  translate: "Перевод",
  summarize: "Суммаризация",
  grammar: "Исправление ошибок",
  style: "Смена стиля",
};

export default function AiControlCenterPage() {
  const [data, setData] = React.useState<AiData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">AI Control Center</h1>
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!data) return null;

  const errorRate = data.totalRequests > 0 ? ((data.failedRequests / data.totalRequests) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-purple-500" />
          <h1 className="text-2xl font-bold">AI Control Center</h1>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Всего запросов", value: data.totalRequests.toLocaleString(), icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Сегодня", value: data.requestsToday.toLocaleString(), icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Токенов (30д)", value: data.totalTokens.toLocaleString(), icon: Brain, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Ошибки", value: `${data.failedRequests} (${errorRate}%)`, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <div className={`rounded-md p-1.5 ${c.bg}`}><c.icon className={`h-4 w-4 ${c.color}`} /></div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">{c.value}</p>
          </div>
        ))}
      </div>

      {/* By Type */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">По типу запроса</h3>
        {data.byType.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {data.byType.map((t) => (
              <div key={t.type} className="flex items-center justify-between">
                <span className="text-sm">{TYPE_LABELS[t.type] ?? t.type}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{t.count} запросов</span>
                  <span className="text-xs text-muted-foreground">{t.tokens.toLocaleString()} токенов</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By Model */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">По модели</h3>
        {data.byModel.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {data.byModel.map((m) => (
              <div key={m.model} className="flex items-center justify-between">
                <code className="rounded bg-muted px-2 py-0.5 text-xs">{m.model}</code>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{m.count} запросов</span>
                  <span className="text-xs text-muted-foreground">{m.tokens.toLocaleString()} токенов</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Users */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Топ пользователей</h3>
        {data.topUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {data.topUsers.map((u, i) => (
              <div key={u.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-right text-xs text-muted-foreground">#{i + 1}</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{u.displayName}</span>
                  <span className="text-xs text-muted-foreground">@{u.username}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{u.count} запросов</span>
                  <span className="text-xs text-muted-foreground">{u.tokens.toLocaleString()} токенов</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage by Day chart */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Запросы за 30 дней</h3>
        {data.byDay.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет данных</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {data.byDay.map((d) => {
              const maxCount = Math.max(...data.byDay.map((x) => x.count), 1);
              const height = (d.count / maxCount) * 100;
              const dateLabel = new Date(d.date).toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{d.count}</span>
                  <div
                    className="w-full max-w-[24px] rounded-t bg-purple-500/70 transition-all hover:bg-purple-500"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[8px] text-muted-foreground">{dateLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
