"use client";

import * as React from "react";
import {
  Ban,
  CheckCircle,
  Clock,
  Search,
  Shield,
  ShieldOff,
  Unlock,
  VolumeX,
  AlertTriangle,
  Activity,
  UserX,
  ScrollText,
  Zap,
  Brain,
  Trash2,
  AlertOctagon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface BannedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isBanned: boolean;
  updatedAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  details: string | null;
  createdAt: string;
  actor: { id: string; username: string; displayName: string };
}

interface ModData {
  recentBans: BannedUser[];
  totalBans: number;
  recentSuspiciousActivity: AuditEntry[];
  flaggedChats: Array<{ id: string; name: string | null; type: string; lastMessageAt: string; _count: { messages: number } }>;
}

export default function ModerationPage() {
  const [data, setData] = React.useState<ModData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [spamTriggers, setSpamTriggers] = React.useState<any[]>([]);
  const [spamWindow, setSpamWindow] = React.useState("1min");
  const [spamScanning, setSpamScanning] = React.useState(false);
  const [aiTab, setAiTab] = React.useState<"scan" | "logs">("scan");
  const [aiScanText, setAiScanText] = React.useState("");
  const [aiScanResult, setAiScanResult] = React.useState<any>(null);
  const [aiScanning, setAiScanning] = React.useState(false);
  const [aiLogs, setAiLogs] = React.useState<any[]>([]);
  const [aiLogsLoading, setAiLogsLoading] = React.useState(false);
  const [aiActionLoading, setAiActionLoading] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderation", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? json);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const scanSpam = async () => {
    setSpamScanning(true);
    try {
      const res = await fetch(`/api/admin/moderation/anti-spam?window=${spamWindow}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSpamTriggers(data.triggers ?? []);
      }
    } finally {
      setSpamScanning(false);
    }
  };

  const handleSpamAction = async (userId: string, action: "mute_readonly" | "ban") => {
    try {
      const res = await fetch("/api/admin/moderation/anti-spam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, userId }),
      });
      if (res.ok) {
        toast.success(action === "ban" ? "Пользователь заблокирован" : "Read-only режим включён");
        scanSpam();
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  const aiScan = async () => {
    if (!aiScanText.trim()) return;
    setAiScanning(true);
    setAiScanResult(null);
    try {
      const res = await fetch("/api/admin/moderation/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: aiScanText }),
      });
      if (res.ok) {
        setAiScanResult(await res.json());
      }
    } catch {
      toast.error("Ошибка сканирования");
    } finally {
      setAiScanning(false);
    }
  };

  const loadAiLogs = React.useCallback(async () => {
    setAiLogsLoading(true);
    try {
      const res = await fetch("/api/admin/moderation/ai-scan", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAiLogs(data.logs ?? []);
      }
    } finally {
      setAiLogsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (aiTab === "logs") loadAiLogs();
  }, [aiTab, loadAiLogs]);

  const handleAiModAction = async (action: "warn" | "ban" | "shadowBan", userId: string) => {
    setAiActionLoading(userId);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, userId, reason: "AI moderation flag" }),
      });
      if (res.ok) {
        toast.success(action === "ban" ? "Пользователь заблокирован" : action === "warn" ? "Предупреждение отправлено" : "Shadow-ban применён");
        loadAiLogs();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка");
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleModAction = async (action: "mute" | "ban" | "unban") => {
    if (!userId.trim()) {
      toast.error("Enter a user ID");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, userId: userId.trim(), reason: reason.trim() || undefined }),
      });
      if (res.ok) {
        const labels: Record<string, string> = { mute: "User muted", ban: "User banned", unban: "User unbanned" };
        toast.success(labels[action]);
        setUserId("");
        setReason("");
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.message ?? err.error ?? "Action failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const flaggedUsers = data?.flaggedChats?.length ?? 0;
  const mutedChats = data?.recentBans?.filter((b) => !b.isBanned).length ?? 0;
  const recentBansCount = data?.totalBans ?? 0;

  const statCards = [
    { label: "Flagged Chats", value: flaggedUsers, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Muted Chats", value: mutedChats, icon: VolumeX, color: "text-orange-500" },
    { label: "Banned Users", value: recentBansCount, icon: Ban, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Moderation</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="max-w-xs"
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="max-w-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleModAction("mute")}
              disabled={actionLoading || !userId.trim()}
              className="flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-400 hover:bg-orange-500/20 disabled:opacity-40"
            >
              <VolumeX className="h-4 w-4" />
              Mute
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Ban this user?")) handleModAction("ban");
              }}
              disabled={actionLoading || !userId.trim()}
              className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40"
            >
              <Ban className="h-4 w-4" />
              Ban
            </button>
            <button
              type="button"
              onClick={() => handleModAction("unban")}
              disabled={actionLoading || !userId.trim()}
              className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              <Unlock className="h-4 w-4" />
              Unban
            </button>
          </div>
        </div>
      </div>

      {/* Anti-Spam Scanner */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Anti-Spam Scanner
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={spamWindow}
              onChange={(e) => setSpamWindow(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="1min">1 минута</option>
              <option value="5min">5 минут</option>
              <option value="1hour">1 час</option>
            </select>
            <button
              type="button"
              onClick={scanSpam}
              disabled={spamScanning}
              className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-sm font-medium text-amber-500 hover:bg-amber-500/20 disabled:opacity-50"
            >
              <Activity className={`h-4 w-4 ${spamScanning ? "animate-spin" : ""}`} />
              Сканировать
            </button>
          </div>
        </div>
        {spamTriggers.length > 0 ? (
          <div className="space-y-2">
            {spamTriggers.map((t) => (
              <div key={t.userId} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-4 w-4 ${t.severity === "high" ? "text-red-500" : t.severity === "medium" ? "text-amber-500" : "text-yellow-500"}`} />
                  <div>
                    <span className="text-sm font-medium">{t.displayName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">@{t.username}</span>
                    <p className="text-xs text-muted-foreground">{t.reason}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSpamAction(t.userId, "mute_readonly")}
                    className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs text-orange-400 hover:bg-orange-500/20"
                  >
                    Read Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpamAction(t.userId, "ban")}
                    className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                  >
                    Ban
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : spamScanning ? (
          <div className="py-4 text-center text-sm text-muted-foreground">Сканирование...</div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">Нажмите "Сканировать" для проверки</div>
        )}
      </div>

      {/* AI Content Moderation */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">AI-модерация контента</h3>
        </div>
        <div className="flex gap-1 mb-3">
          <button
            type="button"
            onClick={() => setAiTab("scan")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${aiTab === "scan" ? "bg-violet-500/10 text-violet-500 border border-violet-500/30" : "text-muted-foreground hover:bg-accent"}`}
          >
            Сканер
          </button>
          <button
            type="button"
            onClick={() => setAiTab("logs")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${aiTab === "logs" ? "bg-violet-500/10 text-violet-500 border border-violet-500/30" : "text-muted-foreground hover:bg-accent"}`}
          >
            Журнал
          </button>
        </div>

        {aiTab === "scan" && (
          <div className="space-y-3">
            <textarea
              value={aiScanText}
              onChange={(e) => setAiScanText(e.target.value)}
              placeholder="Введите текст для проверки через AI-модерацию..."
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={aiScan}
              disabled={aiScanning || !aiScanText.trim()}
              className="flex items-center gap-1.5 rounded-md bg-violet-500/10 border border-violet-500/30 px-3 py-1.5 text-sm font-medium text-violet-500 hover:bg-violet-500/20 disabled:opacity-50"
            >
              <Brain className={`h-4 w-4 ${aiScanning ? "animate-pulse" : ""}`} />
              {aiScanning ? "Сканирование..." : "Сканировать"}
            </button>
            {aiScanResult && (
              <div className={`rounded-lg border p-3 ${aiScanResult.flagged ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {aiScanResult.flagged ? (
                    <AlertOctagon className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className={`text-sm font-medium ${aiScanResult.flagged ? "text-red-500" : "text-green-500"}`}>
                    {aiScanResult.flagged ? "Контент заблокирован" : "Контент безопасен"}
                  </span>
                  <span className="text-xs text-muted-foreground">Score: {aiScanResult.score}</span>
                </div>
                {aiScanResult.flagged && aiScanResult.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {aiScanResult.categories.map((cat: string) => (
                      <span key={cat} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {aiTab === "logs" && (
          <div className="space-y-2">
            {aiLogsLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Загрузка...</div>
            ) : aiLogs.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Нет записей AI-модерации</div>
            ) : (
              aiLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {log.autoAction === "auto_delete" ? (
                      <Trash2 className="h-4 w-4 shrink-0 text-red-500" />
                    ) : log.score > 0.8 ? (
                      <AlertOctagon className="h-4 w-4 shrink-0 text-orange-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{log.user?.displayName}</span>
                        <span className="text-xs text-muted-foreground truncate">@{log.user?.username}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{log.reason}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Score: {log.score} · {new Date(log.createdAt).toLocaleString("ru-RU")}
                        {log.autoAction && ` · ${log.autoAction}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleAiModAction("warn", log.userId)}
                      disabled={aiActionLoading === log.userId}
                      className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Warn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAiModAction("shadowBan", log.userId)}
                      disabled={aiActionLoading === log.userId}
                      className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] text-orange-400 hover:bg-orange-500/20 disabled:opacity-50"
                    >
                      Shadow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Заблокировать пользователя?")) handleAiModAction("ban", log.userId);
                      }}
                      disabled={aiActionLoading === log.userId}
                      className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Suspicious Activity Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <h3 className="text-sm font-semibold">Recent Suspicious Activity</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="p-3">User</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : (data?.recentSuspiciousActivity ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No suspicious activity
                </td>
              </tr>
            ) : (
              (data?.recentSuspiciousActivity ?? []).map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="p-3">
                    <div>
                      <span className="font-medium">{entry.actor.displayName}</span>
                      <span className="ml-2 text-muted-foreground">@{entry.actor.username}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="inline-block rounded bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-400">
                      {entry.action}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{entry.details ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("ru-RU")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Activity Feed */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <h3 className="text-sm font-semibold">Audit Log Feed</h3>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : (data?.recentSuspiciousActivity ?? []).length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No audit entries</div>
          ) : (
            (data?.recentSuspiciousActivity ?? []).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-accent/30"
              >
                <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{entry.actor.displayName}</span>
                    <span className="ml-1 text-muted-foreground">{entry.action.toLowerCase().replace(/_/g, " ")}</span>
                    <span className="ml-1 text-muted-foreground">{entry.targetType}</span>
                  </p>
                  {entry.details && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.details}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("ru-RU")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
