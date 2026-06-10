"use client";

import * as React from "react";
import { Flag, ToggleLeft, ToggleRight, Percent, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureFlag {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercent: number;
  createdAt: string;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = React.useState<FeatureFlag[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newCode, setNewCode] = React.useState("");
  const [newName, setNewName] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feature-flags", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const toggle = async (flag: FeatureFlag) => {
    await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code: flag.code, name: flag.name, enabled: !flag.enabled, rolloutPercent: flag.rolloutPercent }),
    });
    load();
  };

  const updateRollout = async (flag: FeatureFlag, percent: number) => {
    await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code: flag.code, name: flag.name, enabled: flag.enabled, rolloutPercent: percent }),
    });
    load();
  };

  const create = async () => {
    if (!newCode.trim() || !newName.trim()) return;
    await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code: newCode.trim(), name: newName.trim(), enabled: false, rolloutPercent: 0 }),
    });
    setNewCode("");
    setNewName("");
    setShowCreate(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Создать
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex gap-3">
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Код (video_calls)"
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название"
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={create}
              className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground"
            >
              <Save className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="grid gap-3">
          {flags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Flag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{flag.name}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{flag.code}</code>
                  </div>
                  {flag.description && <p className="mt-0.5 text-xs text-muted-foreground">{flag.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={flag.rolloutPercent}
                    onChange={(e) => updateRollout(flag, Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="w-8 text-right text-xs text-muted-foreground">{flag.rolloutPercent}%</span>
                </div>
                <button type="button" onClick={() => toggle(flag)}>
                  {flag.enabled ? (
                    <ToggleRight className="h-8 w-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
