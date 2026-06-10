"use client";

import * as React from "react";
import {
  Shield,
  AlertTriangle,
  Eye,
  MessageSquare,
  UserX,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface Report {
  id: string;
  reporterId: string;
  targetUserId: string | null;
  targetMessageId: string | null;
  targetChatId: string | null;
  reason: string;
  description: string | null;
  status: string;
  evidence: string | null;
  witnesses: string[];
  createdAt: string;
  reporter: { id: string; username: string; displayName: string; avatarUrl: string | null };
  targetUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    warningCount: number;
    isShadowBanned: boolean;
  } | null;
}

interface FlaggedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  warningCount: number;
  isShadowBanned: boolean;
  isReadOnly: boolean;
  isBanned: boolean;
}

interface QueueData {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  flaggedUsers: FlaggedUser[];
}

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam", FRAUD: "Fraud", ABUSE: "Abuse", PORN: "NSFW",
  VIOLENCE: "Violence", FAKE: "Fake Account", OTHER: "Other",
};

const REASON_COLORS: Record<string, string> = {
  SPAM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  FRAUD: "bg-red-500/15 text-red-400 border-red-500/30",
  ABUSE: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PORN: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  VIOLENCE: "bg-red-500/15 text-red-400 border-red-500/30",
  FAKE: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  OTHER: "bg-muted text-muted-foreground border-border",
};

export default function ModerationQueuePage() {
  const [data, setData] = React.useState<QueueData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expandedReport, setExpandedReport] = React.useState<string | null>(null);
  const [resolution, setResolution] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderation/queue", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? json);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleReportAction = async (reportId: string, action: "dismiss" | "warn" | "mute" | "ban") => {
    setActionLoading(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reportId, action, resolution: resolution.trim() || undefined }),
      });
      if (res.ok) {
        const labels: Record<string, string> = {
          dismiss: "Report dismissed", warn: "User warned",
          mute: "User muted", ban: "User banned",
        };
        toast.success(labels[action]);
        setResolution("");
        setExpandedReport(null);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Action failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleShadowBan = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "shadowBan", userId }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(json.data?.action === "shadow_banned" ? "User shadow-banned" : "Shadow ban removed");
        loadData();
      }
    } catch {
      toast.error("Failed to toggle shadow ban");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-xs text-muted-foreground">Pending Reports</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-red-500" />
            <span className="text-xs text-muted-foreground">Flagged Users</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{data?.flaggedUsers?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="text-xs text-muted-foreground">Awaiting Review</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{data?.total ?? 0}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <h3 className="text-sm font-semibold">Pending Reports</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading...
            </div>
          </div>
        ) : (data?.reports ?? []).length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No pending reports</div>
        ) : (
          <div className="divide-y divide-border">
            {(data?.reports ?? []).map((report) => (
              <div key={report.id} className="p-4">
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${REASON_COLORS[report.reason] ?? REASON_COLORS.OTHER}`}>
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </span>
                      <span className="text-sm font-medium">Report by @{report.reporter.username}</span>
                      {report.targetUser && (
                        <span className="text-xs text-muted-foreground">against @{report.targetUser.username}</span>
                      )}
                    </div>
                    {report.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{report.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(report.createdAt).toLocaleString()}</span>
                      {report.evidence && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Eye className="h-3 w-3" /> Evidence provided
                        </span>
                      )}
                      {report.witnesses.length > 0 && (
                        <span className="flex items-center gap-1 text-blue-400">
                          <MessageSquare className="h-3 w-3" /> {report.witnesses.length} witness(es)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {expandedReport === report.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedReport === report.id && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                    {report.evidence && (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">Evidence</h4>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{report.evidence}</p>
                      </div>
                    )}
                    {report.witnesses.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">Witnesses</h4>
                        <div className="flex flex-wrap gap-1">
                          {report.witnesses.map((wid) => (
                            <span key={wid} className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-mono">{wid}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {report.targetUser && (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">Target User</h4>
                        <div className="flex items-center gap-4 text-xs">
                          <span>@{report.targetUser.username}</span>
                          <span>Warnings: {report.targetUser.warningCount}</span>
                          {report.targetUser.isShadowBanned && <span className="text-amber-400">Shadow Banned</span>}
                          <button
                            type="button"
                            onClick={() => handleShadowBan(report.targetUser!.id)}
                            className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400 hover:bg-amber-500/20"
                          >
                            {report.targetUser.isShadowBanned ? "Remove Shadow Ban" : "Shadow Ban"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Resolution Notes (optional)</label>
                      <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Add resolution notes..." />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleReportAction(report.id, "dismiss")} disabled={actionLoading === report.id}
                        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50">
                        <CheckCircle className="h-3 w-3" /> Dismiss
                      </button>
                      <button type="button" onClick={() => handleReportAction(report.id, "warn")} disabled={actionLoading === report.id}
                        className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50">
                        Warn
                      </button>
                      <button type="button" onClick={() => handleReportAction(report.id, "mute")} disabled={actionLoading === report.id}
                        className="flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500/20 disabled:opacity-50">
                        Mute
                      </button>
                      <button type="button" onClick={() => { if (confirm("Ban this user?")) handleReportAction(report.id, "ban"); }} disabled={actionLoading === report.id}
                        className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50">
                        Ban
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(data?.flaggedUsers ?? []).length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="border-b border-border bg-muted/50 px-4 py-3">
            <h3 className="text-sm font-semibold">Flagged Users</h3>
          </div>
          <div className="divide-y divide-border">
            {(data?.flaggedUsers ?? []).map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.displayName}</span>
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.isBanned && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400">Banned</span>}
                    {user.isReadOnly && <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] text-orange-400">Muted</span>}
                    {user.isShadowBanned && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">Shadow Banned</span>}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{user.warningCount} warnings</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleShadowBan(user.id)}
                  className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/20"
                >
                  {user.isShadowBanned ? "Unshadow Ban" : "Shadow Ban"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
