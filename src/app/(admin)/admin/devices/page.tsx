"use client";

import * as React from "react";
import { Smartphone, Shield, AlertTriangle, Search, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  userId: string;
  deviceName: string;
  platform: string;
  browser: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  trustLevel: string;
  lastActivity: string;
  isRevoked: boolean;
  createdAt: string;
  user?: { id: string; username: string; displayName: string };
}

export default function DevicesPage() {
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "active" | "suspicious">("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/devices?filter=${filter}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => { load(); }, [load]);

  const revoke = async (deviceId: string) => {
    if (!confirm("Завершить сеанс?")) return;
    await fetch(`/api/admin/devices/${deviceId}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const filtered = devices.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.deviceName.toLowerCase().includes(q) || d.ipAddress?.toLowerCase().includes(q) || d.user?.username.toLowerCase().includes(q);
  });

  const trustBadge = (level: string) => {
    if (level === "trusted") return <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">Подтверждено</span>;
    if (level === "suspicious") return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-600">Подозрительное</span>;
    return <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600">Новое</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Устройства / Активные сеансы</h1>
        <button type="button" onClick={load} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по устройству, IP, пользователю..."
            className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "active", "suspicious"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn("rounded-md px-3 py-1.5 text-xs", filter === f ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent")}
            >
              {f === "all" ? "Все" : f === "active" ? "Активные" : "Подозрительные"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Устройство</th>
                <th className="px-4 py-2">Пользователь</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Локация</th>
                <th className="px-4 py-2">Доверие</th>
                <th className="px-4 py-2">Последняя активность</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{d.deviceName}</div>
                        <div className="text-xs text-muted-foreground">{d.platform}{d.browser ? ` · ${d.browser}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{d.user?.username ?? d.userId}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{[d.city, d.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3">{trustBadge(d.trustLevel)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(d.lastActivity).toLocaleString("ru")}</td>
                  <td className="px-4 py-3">
                    {!d.isRevoked && (
                      <button type="button" onClick={() => revoke(d.id)} className="text-xs text-destructive hover:underline">
                        Завершить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Нет устройств</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
