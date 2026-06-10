"use client";

import * as React from "react";
import { Bell, Send, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

export default function NotificationsAdminPage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/admin/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>;
  if (!data) return <div className="py-12 text-center text-sm text-muted-foreground">Ошибка</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Центр уведомлений</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Всего отправлено</p>
          <p className="text-2xl font-bold">{data.totalLogs}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Успешная доставка</p>
          <p className="text-2xl font-bold text-emerald-500">
            {data.channelStats?.reduce((s: number, c: any) => s + c.success, 0) ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.totalLogs > 0
              ? `${((data.channelStats?.reduce((s: number, c: any) => s + c.success, 0) ?? 0) / data.totalLogs * 100).toFixed(1)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Ошибки доставки</p>
          <p className="text-2xl font-bold text-red-500">
            {data.channelStats?.reduce((s: number, c: any) => s + c.failed, 0) ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Каналов активно</p>
          <p className="text-2xl font-bold">{data.channelStats?.length ?? 0}</p>
        </div>
      </div>

      {/* Per-channel breakdown */}
      {(data.channelStats ?? []).length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">По каналам</h3>
          <div className="space-y-2">
            {(data.channelStats ?? []).map((c: any) => (
          <div key={c.channel} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase">{c.channel}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">{c.total} всего</span>
              <span className="text-emerald-500">{c.success} OK</span>
              <span className="text-blue-500">{c.delivered} доставлено</span>
              <span className="text-amber-500">{c.opened} открыто</span>
              <span className="text-red-500">{c.failed} ош</span>
              <span className="text-muted-foreground w-12 text-right">
                {c.total > 0 ? `${((c.success / c.total) * 100).toFixed(0)}%` : "—"}
              </span>
            </div>
          </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent logs */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">Последние уведомления</h2>
        <div className="space-y-1">
          {(data.recentLogs ?? []).slice(0, 30).map((log: any) => (
            <div key={log.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                {log.success ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <div>
                  <p className="text-sm font-medium">{log.title ?? log.channel}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.channel} · {new Date(log.createdAt).toLocaleString("ru")}
                    {log.error && ` · ${log.error}`}
                  </p>
                </div>
              </div>
              <span className={cn("text-xs", log.success ? "text-emerald-500" : "text-red-500")}>
                {log.success ? "OK" : "Ошибка"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
