"use client";

import * as React from "react";
import {
  MessageSquare,
  Phone,
  Upload,
  Gift,
  Users,
  Hash,
  Smile,
  Heart,
  Calendar,
  Flame,
  BarChart3,
} from "lucide-react";

interface Stats {
  messagesSent: number;
  messagesReceived: number;
  callsMade: number;
  callMinutes: number;
  filesUploaded: number;
  storageUsed: number;
  giftsSent: number;
  giftsReceived: number;
  groupsCreated: number;
  channelsCreated: number;
  stickersUsed: number;
  reactionsGiven: number;
  daysActive: number;
  longestStreak: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function StatsPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/users/me/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-destructive">Ошибка загрузки</div>
      </div>
    );
  }

  const cards = [
    { icon: <MessageSquare className="h-5 w-5" />, label: "Отправлено", value: stats.messagesSent, color: "text-blue-500" },
    { icon: <MessageSquare className="h-5 w-5" />, label: "Получено", value: stats.messagesReceived, color: "text-green-500" },
    { icon: <Phone className="h-5 w-5" />, label: "Звонков", value: stats.callsMade, color: "text-purple-500" },
    { icon: <Phone className="h-5 w-5" />, label: "Минут разговора", value: stats.callMinutes, color: "text-purple-400" },
    { icon: <Upload className="h-5 w-5" />, label: "Файлов", value: stats.filesUploaded, color: "text-cyan-500" },
    { icon: <Upload className="h-5 w-5" />, label: "Хранилище", value: formatBytes(stats.storageUsed), color: "text-cyan-400" },
    { icon: <Gift className="h-5 w-5" />, label: "Подарков отправлено", value: stats.giftsSent, color: "text-pink-500" },
    { icon: <Gift className="h-5 w-5" />, label: "Подарков получено", value: stats.giftsReceived, color: "text-pink-400" },
    { icon: <Users className="h-5 w-5" />, label: "Групп создано", value: stats.groupsCreated, color: "text-orange-500" },
    { icon: <Hash className="h-5 w-5" />, label: "Каналов создано", value: stats.channelsCreated, color: "text-yellow-500" },
    { icon: <Smile className="h-5 w-5" />, label: "Стикеров использовано", value: stats.stickersUsed, color: "text-teal-500" },
    { icon: <Heart className="h-5 w-5" />, label: "Реакций поставлено", value: stats.reactionsGiven, color: "text-red-500" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Моя активность</h1>
        </div>

        {/* Streak Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/20 p-6">
          <div className="flex items-center gap-4">
            <Flame className="h-12 w-12 text-orange-500" />
            <div>
              <div className="text-3xl font-bold">{stats.longestStreak} дней</div>
              <div className="text-muted-foreground">Рекордная серия активности</div>
            </div>
            <div className="ml-auto text-right">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 text-primary" />
                {stats.daysActive}
              </div>
              <div className="text-sm text-muted-foreground">Дней активности</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40"
            >
              <div className={`mb-2 ${card.color}`}>{card.icon}</div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-xs text-muted-foreground">{card.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
