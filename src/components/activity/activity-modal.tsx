"use client";

import * as React from "react";
import {
  X,
  MessageSquare,
  Users,
  Gift,
  Clock,
  Activity,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface ActivityStats {
  todayMessages: number;
  weekMessages: number;
  monthMessages: number;
  totalMessages: number;
  groupsCreated: number;
  giftsReceived: number;
}

interface ActivityItem {
  id: string;
  type: "message" | "group_created" | "gift_received" | "audit";
  summary: string;
  detail?: string;
  chatName?: string;
  createdAt: string;
}

interface ActivityModalProps {
  open: boolean;
  onClose: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  message: <MessageSquare className="h-4 w-4 text-blue-500" />,
  group_created: <Users className="h-4 w-4 text-green-500" />,
  gift_received: <Gift className="h-4 w-4 text-purple-500" />,
  audit: <Activity className="h-4 w-4 text-orange-500" />,
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function ActivityModal({ open, onClose }: ActivityModalProps) {
  const [stats, setStats] = React.useState<ActivityStats | null>(null);
  const [activities, setActivities] = React.useState<{
    today: ActivityItem[];
    thisWeek: ActivityItem[];
    thisMonth: ActivityItem[];
  }>({ today: [], thisWeek: [], thisMonth: [] });
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"today" | "week" | "month">("today");

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/users/me/activity", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats ?? null);
        setActivities(data.activities ?? { today: [], thisWeek: [], thisMonth: [] });
      })
      .catch(() => toast.error("Ошибка загрузки активности"))
      .finally(() => setLoading(false));
  }, [open]);

  const currentItems = tab === "today" ? activities.today : tab === "week" ? activities.thisWeek : activities.thisMonth;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Активность</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            {stats && (
              <div className="grid grid-cols-3 gap-3 border-b border-border p-4">
                <StatCard
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="Сегодня"
                  value={stats.todayMessages}
                  color="text-blue-500"
                />
                <StatCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="За неделю"
                  value={stats.weekMessages}
                  color="text-green-500"
                />
                <StatCard
                  icon={<Calendar className="h-4 w-4" />}
                  label="За месяц"
                  value={stats.monthMessages}
                  color="text-purple-500"
                />
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border">
              {([
                { key: "today" as const, label: "Сегодня", count: activities.today.length },
                { key: "week" as const, label: "Эта неделя", count: activities.thisWeek.length },
                { key: "month" as const, label: "Этот месяц", count: activities.thisMonth.length },
              ]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
                    tab === t.key
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-y-auto p-4">
              {currentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Нет активности за этот период</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {currentItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                    >
                      <div className="mt-0.5 shrink-0">{typeIcons[item.type]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.summary}</p>
                        {item.detail && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{item.detail}</p>
                        )}
                        {item.chatName && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">в {item.chatName}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className={cn("mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted", color)}>
        {icon}
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
