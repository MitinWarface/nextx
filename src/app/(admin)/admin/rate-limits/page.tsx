"use client";

import * as React from "react";
import { Gauge, Save, RefreshCw } from "lucide-react";
import { toast } from "@/store/toast-store";

interface RateLimitEntry {
  action: string;
  freeLimit: number;
  premiumLimit: number;
  windowMs: number;
}

const ACTION_LABELS: Record<string, string> = {
  messages: "Сообщения",
  group_create: "Создание групп",
  channel_create: "Создание каналов",
  media_upload: "Загрузка медиа",
  reactions: "Реакции",
  search: "Поиск",
};

export default function RateLimitsPage() {
  const [configs, setConfigs] = React.useState<RateLimitEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rate-limits", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const update = (action: string, field: "freeLimit" | "premiumLimit" | "windowMs", value: number) => {
    setConfigs((prev) =>
      prev.map((c) => (c.action === action ? { ...c, [field]: value } : c)),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const c of configs) {
        await fetch("/api/admin/rate-limits", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(c),
        });
      }
      toast.success("Лимиты сохранены");
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const formatWindow = (ms: number) => {
    if (ms >= 3600000) return `${ms / 3600000} ч`;
    if (ms >= 60000) return `${ms / 60000} мин`;
    return `${ms / 1000} сек`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rate Limits</h1>
          <p className="text-sm text-muted-foreground">Лимиты запросов для Free и Premium пользователей</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">Действие</th>
                <th className="px-4 py-3">Окно</th>
                <th className="px-4 py-3">Free лимит</th>
                <th className="px-4 py-3">Premium лимит</th>
                <th className="px-4 py-3">Разница</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => {
                const diff = c.premiumLimit - c.freeLimit;
                const ratio = c.freeLimit > 0 ? (c.premiumLimit / c.freeLimit).toFixed(1) : "∞";
                return (
                  <tr key={c.action} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{ACTION_LABELS[c.action] ?? c.action}</div>
                          <div className="text-xs text-muted-foreground">{c.action}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatWindow(c.windowMs)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={c.freeLimit}
                        onChange={(e) => update(c.action, "freeLimit", Math.max(1, Number(e.target.value)))}
                        className="w-20 rounded-md border border-input bg-transparent px-2 py-1 text-sm text-right"
                      />
                      <span className="ml-1 text-xs text-muted-foreground">/ окно</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={c.premiumLimit}
                        onChange={(e) => update(c.action, "premiumLimit", Math.max(1, Number(e.target.value)))}
                        className="w-20 rounded-md border border-input bg-transparent px-2 py-1 text-sm text-right"
                      />
                      <span className="ml-1 text-xs text-muted-foreground">/ окно</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        +{ratio}x
                      </span>
                    </td>
                  </tr>
                );
              })}
              {configs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Нет конфигураций</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
