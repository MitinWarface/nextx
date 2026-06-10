"use client";

import * as React from "react";
import {
  Code,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Webhook,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface DeveloperApp {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  webhookUrl: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { logs: number };
}

interface AppStats {
  totalRequests: number;
  avgDuration: number;
  avgStatusCode: number;
  successRate: number;
}

interface AppLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  createdAt: string;
}

export default function DeveloperPortalPage() {
  const [apps, setApps] = React.useState<DeveloperApp[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newAppName, setNewAppName] = React.useState("");
  const [newAppDescription, setNewAppDescription] = React.useState("");
  const [newAppWebhook, setNewAppWebhook] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [visibleKeys, setVisibleKeys] = React.useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [selectedApp, setSelectedApp] = React.useState<string | null>(null);
  const [appStats, setAppStats] = React.useState<AppStats | null>(null);
  const [appLogs, setAppLogs] = React.useState<AppLog[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(false);

  const loadApps = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/developer/apps", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setApps(json.data?.apps ?? json.apps ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadApps();
  }, [loadApps]);

  const loadAppLogs = React.useCallback(async (appId: string) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/developer/apps/${appId}/logs`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setAppStats(json.data?.stats ?? json.stats ?? null);
        setAppLogs(json.data?.logs ?? json.logs ?? []);
      }
    } catch {} finally {
      setLogsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedApp) {
      loadAppLogs(selectedApp);
    }
  }, [selectedApp, loadAppLogs]);

  const handleCreateApp = async () => {
    if (!newAppName.trim()) {
      toast.error("App name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/developer/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newAppName.trim(),
          description: newAppDescription.trim() || undefined,
          webhookUrl: newAppWebhook.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success("App created successfully");
        setShowCreateForm(false);
        setNewAppName("");
        setNewAppDescription("");
        setNewAppWebhook("");
        loadApps();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create app");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteApp = async (appId: string, appName: string) => {
    if (!confirm(`Delete app "${appName}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/developer/apps/${appId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("App deleted");
        loadApps();
        if (selectedApp === appId) {
          setSelectedApp(null);
          setAppStats(null);
          setAppLogs([]);
        }
      }
    } catch {
      toast.error("Failed to delete app");
    }
  };

  const toggleKeyVisibility = (appId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const copyApiKey = async (key: string, appId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(appId);
      setTimeout(() => setCopiedKey(null), 2000);
      toast.success("API key copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 12) return key;
    return key.slice(0, 8) + "..." + key.slice(-4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Developer Portal</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New App
        </button>
      </div>

      {/* Create App Form */}
      {showCreateForm && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <h3 className="text-sm font-semibold">Create New App</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">App Name *</label>
              <Input
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="My Awesome App"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Webhook URL</label>
              <Input
                value={newAppWebhook}
                onChange={(e) => setNewAppWebhook(e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={newAppDescription}
              onChange={(e) => setNewAppDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateApp}
              disabled={creating || !newAppName.trim()}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Apps List */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <h3 className="text-sm font-semibold">Your Apps</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading...
            </div>
          </div>
        ) : apps.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No apps yet. Create your first app to get started.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {apps.map((app) => (
              <div
                key={app.id}
                className={`p-4 hover:bg-accent/30 ${selectedApp === app.id ? "bg-accent/50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{app.name}</span>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          app.isActive
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {app.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {app.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{app.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {app._count.logs} requests
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                      {app.webhookUrl && (
                        <span className="flex items-center gap-1">
                          <Webhook className="h-3 w-3" />
                          Webhook configured
                        </span>
                      )}
                    </div>
                    {/* API Key */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">API Key:</span>
                      <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                        {visibleKeys.has(app.id) ? app.apiKey : maskKey(app.apiKey)}
                      </code>
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(app.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {visibleKeys.has(app.id) ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyApiKey(app.apiKey, app.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {copiedKey === app.id ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => setSelectedApp(selectedApp === app.id ? null : app.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      {selectedApp === app.id ? "Hide Details" : "View Details"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteApp(app.id, app.name)}
                      className="rounded-md border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* App Details (expanded) */}
                {selectedApp === app.id && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                    {logsLoading ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        Loading stats...
                      </div>
                    ) : (
                      <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div className="rounded border border-border p-3">
                            <p className="text-xs text-muted-foreground">Total Requests</p>
                            <p className="mt-1 text-lg font-bold">{appStats?.totalRequests ?? 0}</p>
                          </div>
                          <div className="rounded border border-border p-3">
                            <p className="text-xs text-muted-foreground">Success Rate</p>
                            <p className="mt-1 text-lg font-bold">
                              {(appStats?.successRate ?? 0).toFixed(1)}%
                            </p>
                          </div>
                          <div className="rounded border border-border p-3">
                            <p className="text-xs text-muted-foreground">Avg Response</p>
                            <p className="mt-1 text-lg font-bold">
                              {(appStats?.avgDuration ?? 0).toFixed(0)}ms
                            </p>
                          </div>
                          <div className="rounded border border-border p-3">
                            <p className="text-xs text-muted-foreground">Avg Status</p>
                            <p className="mt-1 text-lg font-bold">
                              {(appStats?.avgStatusCode ?? 0).toFixed(0)}
                            </p>
                          </div>
                        </div>

                        {/* Recent Logs */}
                        <div>
                          <h4 className="text-xs font-semibold mb-2">Recent Activity</h4>
                          {appLogs.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No activity yet</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border text-muted-foreground">
                                    <th className="pb-1 text-left font-medium">Method</th>
                                    <th className="pb-1 text-left font-medium">Endpoint</th>
                                    <th className="pb-1 text-left font-medium">Status</th>
                                    <th className="pb-1 text-left font-medium">Duration</th>
                                    <th className="pb-1 text-left font-medium">Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {appLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-border/50">
                                      <td className="py-1">
                                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                                          {log.method}
                                        </span>
                                      </td>
                                      <td className="py-1 font-mono">{log.endpoint}</td>
                                      <td className="py-1">
                                        <span
                                          className={`inline-flex items-center gap-1 ${
                                            log.statusCode >= 200 && log.statusCode < 400
                                              ? "text-emerald-400"
                                              : "text-red-400"
                                          }`}
                                        >
                                          {log.statusCode >= 200 && log.statusCode < 400 ? (
                                            <CheckCircle className="h-3 w-3" />
                                          ) : (
                                            <XCircle className="h-3 w-3" />
                                          )}
                                          {log.statusCode}
                                        </span>
                                      </td>
                                      <td className="py-1">{log.duration}ms</td>
                                      <td className="py-1 text-muted-foreground">
                                        {new Date(log.createdAt).toLocaleTimeString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentation Link */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold mb-2">API Documentation</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Use your API key to authenticate requests. Include it in the Authorization header:
        </p>
        <code className="block rounded bg-muted p-3 text-xs font-mono">
          Authorization: Bearer YOUR_API_KEY
        </code>
        <a
          href="/docs/api"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View full documentation
        </a>
      </div>
    </div>
  );
}
