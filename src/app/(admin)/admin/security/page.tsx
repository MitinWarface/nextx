"use client";

import * as React from "react";
import { Shield, AlertTriangle, Lock, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityEvent {
  id: string;
  userId: string | null;
  type: string;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  details: any;
  createdAt: string;
  user?: { id: string; username: string; displayName: string };
}

const EVENT_LABELS: Record<string, string> = {
  login_success: "Успешный вход",
  login_failed: "Неудачный вход",
  password_change: "Смена пароля",
  two_factor_enable: "2FA включена",
  two_factor_disable: "2FA отключена",
  session_revoked: "Сеанс завершён",
  suspicious_activity: "Подозрительная активность",
};

const EVENT_COLORS: Record<string, string> = {
  login_success: "text-green-600",
  login_failed: "text-red-600",
  password_change: "text-blue-600",
  suspicious_activity: "text-orange-600",
};

export default function SecurityPage() {
  const [events, setEvents] = React.useState<SecurityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<string>("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = typeFilter ? `/api/admin/security?type=${typeFilter}` : "/api/admin/security";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
      }
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Security Center</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(EVENT_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTypeFilter(typeFilter === key ? "" : key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs transition-colors",
              typeFilter === key ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Время</th>
                <th className="px-4 py-2">Тип</th>
                <th className="px-4 py-2">Пользователь</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Локация</th>
                <th className="px-4 py-2">Устройство</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString("ru")}</td>
                  <td className={cn("px-4 py-3 text-xs font-medium", EVENT_COLORS[e.type] ?? "text-muted-foreground")}>
                    {EVENT_LABELS[e.type] ?? e.type}
                  </td>
                  <td className="px-4 py-3 text-xs">{e.user?.username ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{[e.city, e.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-xs">{e.device ?? "—"}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Нет событий</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
