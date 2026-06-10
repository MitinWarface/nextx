"use client";

import * as React from "react";
import { Users, Plus, Trash2, Save } from "lucide-react";
import { toast } from "@/store/toast-store";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filter: any;
  userCount: number;
  createdAt: string;
}

export default function SegmentsPage() {
  const [segments, setSegments] = React.useState<Segment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/segments", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSegments(data.segments);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/admin/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
    });
    if (res.ok) {
      toast.success("Сегмент создан");
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      load();
    } else {
      toast.error("Ошибка создания");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить сегмент?")) return;
    await fetch(`/api/admin/segments/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Segments</h1>
          <p className="text-sm text-muted-foreground">Сегментация пользователей для таргетинга</p>
        </div>
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
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название сегмента"
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Описание (необязательно)"
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={create}
            className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground"
          >
            <Save className="inline h-4 w-4 mr-1" />
            Создать
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="grid gap-3">
          {segments.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{s.name}</div>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.userCount.toLocaleString("ru")} пользователей · {new Date(s.createdAt).toLocaleDateString("ru")}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {segments.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет сегментов</div>
          )}
        </div>
      )}
    </div>
  );
}
