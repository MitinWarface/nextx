"use client";

import * as React from "react";
import {
  Users,
  Activity,
  UserPlus,
  MessageSquare,
  Crown,
  Wallet,
  AlertTriangle,
  Ban,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  newRegistrations: number;
  messagesLast24h: number;
  premiumUsers: number;
  totalRevenue: number;
  openReports: number;
  bannedUsers: number;
}

const STAT_CARDS = [
  {
    key: "totalUsers" as const,
    label: "Всего пользователей",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    key: "onlineUsers" as const,
    label: "Онлайн сейчас",
    icon: Activity,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    key: "newRegistrations" as const,
    label: "Новых за 24ч",
    icon: UserPlus,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    key: "messagesLast24h" as const,
    label: "Сообщений за 24ч",
    icon: MessageSquare,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    key: "premiumUsers" as const,
    label: "Premium пользователей",
    icon: Crown,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    key: "totalRevenue" as const,
    label: "Доход",
    icon: Wallet,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    format: "currency" as const,
  },
  {
    key: "openReports" as const,
    label: "Открытых жалоб",
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    key: "bannedUsers" as const,
    label: "Заблокировано",
    icon: Ban,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
];

function formatValue(value: number, format?: "currency"): string {
  if (format === "currency") {
    return `${value.toLocaleString("ru-RU")} ₽`;
  }
  return value.toLocaleString("ru-RU");
}

export default function DashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((d) => setStats(d.data ?? d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <p className="text-sm text-muted-foreground">
          Обзор основных метрик платформы
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? STAT_CARDS.map((card) => (
              <div
                key={card.key}
                className="animate-pulse rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className={`h-5 w-5 rounded ${card.bg}`} />
                </div>
                <div className="mt-3 h-8 w-20 rounded bg-muted" />
              </div>
            ))
          : STAT_CARDS.map((card) => {
              const Icon = card.icon;
              const value = stats?.[card.key] ?? 0;
              return (
                <div
                  key={card.key}
                  className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/80 hover:bg-accent/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {card.label}
                    </span>
                    <div className={`rounded-md p-1.5 ${card.bg}`}>
                      <Icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight">
                    {formatValue(value, card.format)}
                  </p>
                </div>
              );
            })}
      </div>
    </div>
  );
}
