"use client";

import * as React from "react";
import { Users, MessageSquare, Wifi, Activity } from "lucide-react";

interface Stats {
  userCount: number;
  chatCount: number;
  messageCount: number;
  onlineCount: number;
  recentUsers: Array<{
    id: string;
    username: string;
    displayName: string;
    createdAt: string;
    role: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then((d) => setStats(d.data ?? d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Загрузка...</div>;
  }

  if (!stats) {
    return <div className="text-destructive">Ошибка загрузки статистики</div>;
  }

  const cards = [
    { label: "Пользователей", value: stats.userCount, icon: Users, color: "text-blue-500" },
    { label: "Чатов", value: stats.chatCount, icon: MessageSquare, color: "text-green-500" },
    { label: "Сообщений", value: stats.messageCount, icon: Activity, color: "text-purple-500" },
    { label: "Онлайн", value: stats.onlineCount, icon: Wifi, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <Icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold">{c.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Последние пользователи</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-2">Имя</th>
              <th className="pb-2">Username</th>
              <th className="pb-2">Роль</th>
              <th className="pb-2">Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentUsers.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="py-2">{u.displayName}</td>
                <td className="py-2 text-muted-foreground">@{u.username}</td>
                <td className="py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    u.role === "SUPER_ADMIN" ? "bg-red-500/10 text-red-500"
                      : u.role === "ADMIN" ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-2 text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("ru")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
