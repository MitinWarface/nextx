"use client";

import * as React from "react";
import {
  Megaphone,
  Search,
  Pause,
  Play,
  Trash2,
  Plus,
  Eye,
  MousePointerClick,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast-store";

interface AdCampaign {
  id: string;
  title: string;
  channelId: string;
  creatorId: string;
  budget: number;
  spent: number;
  cpm: number;
  status: string;
  startAt: string | null;
  endAt: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
  channel: { id: string; name: string | null };
  creator: { id: string; username: string; displayName: string };
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-500",
  paused: "bg-amber-500/10 text-amber-500",
  completed: "bg-blue-500/10 text-blue-500",
};

const PAGE_SIZE = 20;

export default function AdminAdsPage() {
  const [campaigns, setCampaigns] = React.useState<AdCampaign[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    channelId: "",
    title: "",
    budget: "",
    cpm: "",
  });

  const loadCampaigns = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/ads?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setCampaigns(json.campaigns ?? []);
        setTotal(json.total ?? 0);
      }
    } catch {
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  React.useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    setActingId(campaignId);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId, status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Campaign ${newStatus}`);
        loadCampaigns();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm("Delete this campaign?")) return;
    setActingId(campaignId);
    try {
      const res = await fetch(`/api/admin/ads?campaignId=${campaignId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Campaign deleted");
        loadCampaigns();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActingId(null);
    }
  };

  const handleCreate = async () => {
    if (!createForm.channelId || !createForm.title || !createForm.budget || !createForm.cpm) {
      toast.error("All fields are required");
      return;
    }
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channelId: createForm.channelId,
          title: createForm.title,
          budget: parseInt(createForm.budget),
          cpm: parseInt(createForm.cpm),
        }),
      });
      if (res.ok) {
        toast.success("Campaign created");
        setShowCreate(false);
        setCreateForm({ channelId: "", title: "", budget: "", cpm: "" });
        loadCampaigns();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Ad Campaigns</h1>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Total Budget</div>
          <div className="text-2xl font-bold">{totalBudget.toLocaleString()} NC</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Total Spent</div>
          <div className="text-2xl font-bold">{totalSpent.toLocaleString()} NC</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Impressions</div>
          <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Clicks</div>
          <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
        </div>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium">Create Campaign</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Channel ID"
              value={createForm.channelId}
              onChange={(e) => setCreateForm((f) => ({ ...f, channelId: e.target.value }))}
            />
            <Input
              placeholder="Title"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              placeholder="Budget (NC)"
              type="number"
              value={createForm.budget}
              onChange={(e) => setCreateForm((f) => ({ ...f, budget: e.target.value }))}
            />
            <Input
              placeholder="CPM (NC per 1k)"
              type="number"
              value={createForm.cpm}
              onChange={(e) => setCreateForm((f) => ({ ...f, cpm: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} size="sm">Create</Button>
            <Button onClick={() => setShowCreate(false)} variant="ghost" size="sm">Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
        <span className="text-sm text-muted-foreground">Total: {total}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="p-3">Title</th>
              <th className="p-3">Channel</th>
              <th className="p-3">Creator</th>
              <th className="p-3">Budget</th>
              <th className="p-3">Spent</th>
              <th className="p-3">CPM</th>
              <th className="p-3">Impressions</th>
              <th className="p-3">Clicks</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  No campaigns
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3 text-muted-foreground">{c.channel.name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.creator.displayName}</td>
                  <td className="p-3">{c.budget.toLocaleString()} NC</td>
                  <td className="p-3">{c.spent.toLocaleString()} NC</td>
                  <td className="p-3">{c.cpm}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      {c.impressions.toLocaleString()}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                      {c.clicks.toLocaleString()}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {c.status === "draft" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(c.id, "active")}
                          disabled={actingId === c.id}
                          className="rounded p-1 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                          title="Activate"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {c.status === "active" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(c.id, "paused")}
                          disabled={actingId === c.id}
                          className="rounded p-1 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500"
                          title="Pause"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      {c.status === "paused" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(c.id, "active")}
                          disabled={actingId === c.id}
                          className="rounded p-1 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                          title="Resume"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={actingId === c.id}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
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
