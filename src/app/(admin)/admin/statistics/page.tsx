"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  MessageSquare,
  Crown,
  Wallet,
  TrendingUp,
  BarChart3,
  Clock,
} from "lucide-react";

interface StatsData {
  totalUsers: number;
  onlineUsers: number;
  newRegistrations: number;
  messagesLast24h: number;
  premiumUsers: number;
  totalRevenue: number;
}

interface AnalyticsData {
  messagesByDay: Array<{ date: string; count: number }>;
  totalMessages: number;
  totalUsers: number;
  retention: Array<{ date: string; dau: number; newUsers: number }>;
  retentionData?: {
    day1?: number;
    day7?: number;
    day14?: number;
    day30?: number;
  };
}

function formatCurrency(kopecks: number): string {
  return `${(kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0 })} ₽`;
}

export default function StatisticsPage() {
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/analytics", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([s, a]) => {
        setStats(s.data ?? s);
        setAnalytics(a.data ?? a);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Статистика</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-5">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-3 h-8 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="animate-pulse h-64 rounded-lg border border-border bg-card" />
      </div>
    );
  }

  const dau = stats?.onlineUsers ?? 0;
  const mau = stats?.totalUsers ?? 0;
  const messagesToday = stats?.messagesLast24h ?? 0;
  const newToday = stats?.newRegistrations ?? 0;
  const premiumUsers = stats?.premiumUsers ?? 0;
  const totalUsers = stats?.totalUsers ?? 1;
  const premiumRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : "0";
  const revenue = stats?.totalRevenue ?? 0;

  const messagesByDay = analytics?.messagesByDay ?? [];

  const last7 = messagesByDay.slice(-7);
  const maxCount = Math.max(...last7.map((d) => d.count), 1);

  const cards = [
    { label: "DAU", value: dau.toLocaleString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "MAU", value: mau.toLocaleString(), icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Сообщений сегодня", value: messagesToday.toLocaleString(), icon: MessageSquare, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { label: "Новых регистраций", value: newToday.toLocaleString(), icon: UserPlus, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Статистика</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <div className={`rounded-md p-1.5 ${c.bg}`}>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-1 text-sm font-semibold">Конверсия в Premium</h3>
          <p className="text-xs text-muted-foreground mb-4">{premiumUsers} из {totalUsers.toLocaleString()} пользователей</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold">{premiumRate}%</span>
            <Crown className="h-5 w-5 text-yellow-500 mb-1" />
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-yellow-500 transition-all"
              style={{ width: `${Math.min(Number(premiumRate), 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-1 text-sm font-semibold">Доход</h3>
          <p className="text-xs text-muted-foreground mb-4">Общий доход за все время</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold">{formatCurrency(revenue)}</span>
            <Wallet className="h-5 w-5 text-emerald-500 mb-1" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {formatCurrency(Math.round(revenue / Math.max(totalUsers, 1)))} на пользователя
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Сообщения за последние 7 дней</h3>
        </div>
        {last7.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Нет данных</div>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {last7.map((day) => {
              const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              const dateLabel = new Date(day.date).toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{day.count.toLocaleString()}</span>
                  <div className="w-full flex justify-center">
                    <div
                      className="w-full max-w-[48px] rounded-t bg-primary/70 transition-all hover:bg-primary"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Retention Chart */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Retention — DAU за 14 дней</h3>
        </div>
        {(() => {
          const retention = analytics?.retention ?? [];
          if (retention.length === 0) {
            return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Нет данных</div>;
          }
          const maxDau = Math.max(...retention.map((d: any) => d.dau), 1);
          return (
            <div className="flex items-end gap-1 h-48">
              {retention.map((day: any) => {
                const height = maxDau > 0 ? (day.dau / maxDau) * 100 : 0;
                const dateLabel = new Date(day.date).toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{day.dau}</span>
                    <div className="w-full flex justify-center">
                      <div
                        className="w-full max-w-[32px] rounded-t bg-emerald-500/70 transition-all hover:bg-emerald-500"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{dateLabel}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Retention % Table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Retention</h3>
        </div>
        {(() => {
          const retention = analytics?.retention ?? [];
          const totalUsers = stats?.totalUsers ?? 1;

          const computeRetention = (daysBack: number): number => {
            if (retention.length === 0) return 0;
            const now = new Date();
            const target = new Date(now.getTime() - daysBack * 86400000);
            const targetStr = target.toISOString().slice(0, 10);
            const entry = retention.find((r) => r.date === targetStr);
            if (entry) return Math.round((entry.dau / Math.max(totalUsers, 1)) * 100);
            const closest = retention.reduce((best, r) => {
              const diff = Math.abs(new Date(r.date).getTime() - target.getTime());
              return diff < best.diff ? { diff, entry: r } : best;
            }, { diff: Infinity, entry: retention[0] });
            return Math.round((closest.entry.dau / Math.max(totalUsers, 1)) * 100);
          };

          const retentionData = analytics?.retentionData;
          const rows = [
            { label: "Day 1", value: retentionData?.day1 ?? computeRetention(1) },
            { label: "Day 7", value: retentionData?.day7 ?? computeRetention(7) },
            { label: "Day 14", value: retentionData?.day14 ?? computeRetention(14) },
            { label: "Day 30", value: retentionData?.day30 ?? computeRetention(30) },
          ];

          const getColor = (pct: number) => {
            if (pct > 50) return "text-emerald-500";
            if (pct >= 20) return "text-yellow-500";
            return "text-red-500";
          };

          const getBg = (pct: number) => {
            if (pct > 50) return "bg-emerald-500/10";
            if (pct >= 20) return "bg-yellow-500/10";
            return "bg-red-500/10";
          };

          return (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                    <th className="p-3 font-medium">Период</th>
                    <th className="p-3 font-medium text-right">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/50 last:border-0">
                      <td className="p-3 font-medium">{row.label}</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getColor(row.value)} ${getBg(row.value)}`}>
                          {row.value}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
