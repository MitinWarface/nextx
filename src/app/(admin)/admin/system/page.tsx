"use client";

import * as React from "react";
import {
  Server,
  Database,
  HardDrive,
  Wifi,
  Cloud,
  Search,
  CreditCard,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

interface ServiceStatus {
  id: string;
  name: string;
  icon: React.ElementType;
  status: "ok" | "error" | "checking";
  lastCheck: Date | null;
  latencyMs: number | null;
}

interface HealthResponse {
  api: { ok: boolean; latencyMs: number };
  db: { ok: boolean; latencyMs: number };
  redis: { ok: boolean; latencyMs: number };
  storage: { ok: boolean; latencyMs: number };
  websocket: { ok: boolean; latencyMs: number };
  search: { ok: boolean; latencyMs: number };
  payments: { ok: boolean; latencyMs: number };
  notifications: { ok: boolean; latencyMs: number };
  nodeVersion: string;
  platform: string;
  arch: string;
}

export default function SystemPage() {
  const [services, setServices] = React.useState<ServiceStatus[]>([
    { id: "api", name: "API Server", icon: Server, status: "checking", lastCheck: null, latencyMs: null },
    { id: "db", name: "Database (PostgreSQL)", icon: Database, status: "checking", lastCheck: null, latencyMs: null },
    { id: "redis", name: "Redis Cache", icon: HardDrive, status: "checking", lastCheck: null, latencyMs: null },
    { id: "ws", name: "WebSocket", icon: Wifi, status: "checking", lastCheck: null, latencyMs: null },
    { id: "storage", name: "File Storage", icon: Cloud, status: "checking", lastCheck: null, latencyMs: null },
    { id: "search", name: "Search Service", icon: Search, status: "checking", lastCheck: null, latencyMs: null },
    { id: "payments", name: "Payments (YooKassa)", icon: CreditCard, status: "checking", lastCheck: null, latencyMs: null },
    { id: "notifications", name: "Notifications", icon: Bell, status: "checking", lastCheck: null, latencyMs: null },
  ]);
  const [loading, setLoading] = React.useState(true);
  const [sysInfo, setSysInfo] = React.useState<{ nodeVersion: string; platform: string; arch: string } | null>(null);

  const checkServices = React.useCallback(async () => {
    setLoading(true);
    const now = new Date();

    const updateService = (id: string, status: "ok" | "error", latencyMs: number) =>
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, lastCheck: now, latencyMs } : s))
      );

    try {
      const res = await fetch("/api/admin/health", { credentials: "include" });
      if (!res.ok) {
        updateService("api", "error", 0);
        setLoading(false);
        return;
      }
      const data: HealthResponse = await res.json();

      updateService("api", data.api.ok ? "ok" : "error", data.api.latencyMs);
      updateService("db", data.db.ok ? "ok" : "error", data.db.latencyMs);
      updateService("redis", data.redis.ok ? "ok" : "error", data.redis.latencyMs);
      updateService("ws", data.websocket.ok ? "ok" : "error", data.websocket.latencyMs);
      updateService("storage", data.storage.ok ? "ok" : "error", data.storage.latencyMs);
      updateService("search", data.search.ok ? "ok" : "error", data.search.latencyMs);
      updateService("payments", data.payments.ok ? "ok" : "error", data.payments.latencyMs);
      updateService("notifications", data.notifications.ok ? "ok" : "error", data.notifications.latencyMs);
      setSysInfo({ nodeVersion: data.nodeVersion, platform: data.platform, arch: data.arch });
    } catch {
      updateService("api", "error", 0);
    }

    setLoading(false);
  }, []);

  React.useEffect(() => {
    checkServices();
  }, [checkServices]);

  const statusIcon = (status: ServiceStatus["status"]) => {
    if (status === "checking") return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const statusLabel = (status: ServiceStatus["status"]) => {
    if (status === "checking") return "Проверка...";
    if (status === "ok") return "Operational";
    return "Error";
  };

  const statusColor = (status: ServiceStatus["status"]) => {
    if (status === "ok") return "bg-green-500";
    if (status === "error") return "bg-red-500";
    return "bg-yellow-500 animate-pulse";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Система</h1>
        <button
          type="button"
          onClick={checkServices}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => {
          const Icon = svc.icon;
          return (
            <div
              key={svc.id}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{svc.name}</span>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${statusColor(svc.status)}`} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {statusIcon(svc.status)}
                <span className={`text-sm ${svc.status === "ok" ? "text-green-500" : svc.status === "error" ? "text-red-500" : "text-muted-foreground"}`}>
                  {statusLabel(svc.status)}
                </span>
              </div>
              {svc.latencyMs !== null && svc.status !== "checking" && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {svc.latencyMs}ms
                </div>
              )}
              {svc.lastCheck && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {svc.lastCheck.toLocaleTimeString("ru")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Информация о системе</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Версия приложения</span>
            <span className="text-sm font-medium">1.0.0</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Node.js</span>
            <span className="text-sm font-medium">{sysInfo?.nodeVersion ?? process.version}</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Платформа</span>
            <span className="text-sm font-medium">{sysInfo?.platform ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Архитектура</span>
            <span className="text-sm font-medium">{sysInfo?.arch ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Сервисов в системе</span>
            <span className="text-sm font-medium">{services.filter((s) => s.status === "ok").length} / {services.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
