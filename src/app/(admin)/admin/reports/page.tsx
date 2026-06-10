"use client";

import * as React from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  MessageSquareWarning,
  MoreHorizontal,
  ShieldOff,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "@/store/toast-store";

interface Report {
  id: string;
  reason: string;
  status: string;
  description?: string;
  targetUserId?: string;
  createdAt: string;
  reporter: { id: string; username: string; displayName: string };
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  fraud: "Fraud",
  abuse: "Abuse",
  porn: "Porn",
  violence: "Violence",
  fake: "Fake",
  other: "Other",
};

const REASON_COLORS: Record<string, string> = {
  spam: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  fraud: "bg-red-500/15 text-red-400 border border-red-500/30",
  abuse: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  porn: "bg-pink-500/15 text-pink-400 border border-pink-500/30",
  violence: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  fake: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  other: "bg-muted text-muted-foreground border border-border",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Open",
  REVIEWED: "Reviewed",
  ACTION_TAKEN: "Action taken",
  DISMISSED: "Dismissed",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  REVIEWED: "bg-blue-500/15 text-blue-400",
  ACTION_TAKEN: "bg-emerald-500/15 text-emerald-400",
  DISMISSED: "bg-muted text-muted-foreground",
};

const TAB_MAP: Record<string, string | undefined> = {
  all: undefined,
  open: "PENDING",
  resolved: "ACTION_TAKEN",
  dismissed: "DISMISSED",
};

const TABS = ["all", "open", "resolved", "dismissed"] as const;

export default function ReportsPage() {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [tab, setTab] = React.useState<string>("all");
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const loadReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      const mappedStatus = TAB_MAP[tab];
      if (mappedStatus) params.set("status", mappedStatus);
      const res = await fetch(`/api/admin/reports?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? data.data?.reports ?? []);
        setTotal(data.total ?? data.data?.total ?? 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, tab]);

  React.useEffect(() => { loadReports(); }, [loadReports]);

  const handleAction = async (reportId: string, action: "dismiss" | "warn" | "mute" | "ban") => {
    const labels: Record<string, string> = {
      dismiss: "Dismissed",
      warn: "Warning sent",
      mute: "Chat muted",
      ban: "User banned",
    };
    setActionLoading(`${reportId}-${action}`);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reportId, action }),
      });
      if (res.ok) {
        toast.success(labels[action]);
        loadReports();
      } else {
        const err = await res.json();
        toast.error(err.message ?? err.error ?? "Action failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Reports</h1>
        <span className="text-sm text-muted-foreground">Total: {total}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setPage(1); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="p-3">Reporter</th>
              <th className="p-3">Target</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No reports found
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="p-3">
                    <div>
                      <span className="font-medium">{r.reporter.displayName}</span>
                      <span className="ml-2 text-muted-foreground">@{r.reporter.username}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.targetUserId?.slice(0, 8) ?? "—"}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${REASON_COLORS[r.reason] ?? REASON_COLORS.other}`}>
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? ""}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleAction(r.id, "dismiss")}
                        disabled={actionLoading === `${r.id}-dismiss` || r.status !== "PENDING"}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
                        title="Dismiss"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(r.id, "warn")}
                        disabled={actionLoading === `${r.id}-warn` || r.status !== "PENDING"}
                        className="rounded p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400 disabled:opacity-40"
                        title="Warn user"
                      >
                        <MessageSquareWarning className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(r.id, "mute")}
                        disabled={actionLoading === `${r.id}-mute` || r.status !== "PENDING"}
                        className="rounded p-1.5 text-muted-foreground hover:bg-orange-500/10 hover:text-orange-400 disabled:opacity-40"
                        title="Mute user"
                      >
                        <VolumeX className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Ban this user?")) handleAction(r.id, "ban");
                        }}
                        disabled={actionLoading === `${r.id}-ban` || r.status !== "PENDING"}
                        className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                        title="Ban user"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="py-1 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
