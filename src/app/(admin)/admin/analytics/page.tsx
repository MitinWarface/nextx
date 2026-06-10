"use client";

import * as React from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Users, MessageSquare, FolderOpen, Activity, TrendingUp, Globe } from "lucide-react";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface AnalyticsData {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  onlineUsers: number;
  activeUsersWeek: number;
  recentMessagesToday: number;
  usersByDay: Array<{ date: string; count: number }>;
  messagesByDay: Array<{ date: string; count: number }>;
  messagesByType: Array<{ type: string; count: number }>;
  chatsByType: Array<{ type: string; count: number }>;
  recentUsers: Array<{ id: string; displayName: string; username: string; avatarUrl: string | null; createdAt: string; status: string }>;
}

export default function AnalyticsPage() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/analytics", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d.data ?? d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Загрузка…</div>;
  }

  if (!data) {
    return <div className="p-8 text-destructive">Ошибка загрузки данных</div>;
  }

  const statCards = [
    { label: "Всего пользователей", value: data.totalUsers, icon: Users, color: "text-blue-500" },
    { label: "Онлайн", value: data.onlineUsers, icon: Globe, color: "text-green-500" },
    { label: "Активных (7д)", value: data.activeUsersWeek, icon: Activity, color: "text-purple-500" },
    { label: "Всего чатов", value: data.totalChats, icon: FolderOpen, color: "text-amber-500" },
    { label: "Всего сообщений", value: data.totalMessages, icon: MessageSquare, color: "text-cyan-500" },
    { label: "Сообщений сегодня", value: data.recentMessagesToday, icon: TrendingUp, color: "text-rose-500" },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Аналитика</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Users by day */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-4 text-sm font-semibold">Новые пользователи (30д)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.usersByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Messages by day */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-4 text-sm font-semibold">Сообщения (30д)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.messagesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Messages by type */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-4 text-sm font-semibold">Типы сообщений</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.messagesByType}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ type: t, percent: p }: any) => `${t} ${((p ?? 0) * 100).toFixed(0)}%`}
              >
                {data.messagesByType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chat types */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-4 text-sm font-semibold">Типы чатов</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.chatsByType}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ type: t, percent: p }: any) => `${t} ${((p ?? 0) * 100).toFixed(0)}%`}
              >
                {data.chatsByType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent users */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-4 text-sm font-semibold">Недавние пользователи</h3>
        <div className="space-y-2">
          {data.recentUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                {u.displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <span className={`h-2 w-2 rounded-full ${u.status === "ONLINE" ? "bg-green-500" : "bg-gray-400"}`} />
              <span className="text-xs text-muted-foreground">
                {new Date(u.createdAt).toLocaleDateString("ru-RU")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
