"use client";

import * as React from "react";
import { Scale, Plus, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Ожидает", color: "text-yellow-500", icon: Clock },
  processing: { label: "Обрабатывается", color: "text-blue-500", icon: AlertTriangle },
  completed: { label: "Выполнено", color: "text-emerald-500", icon: CheckCircle },
  rejected: { label: "Отклонено", color: "text-red-500", icon: XCircle },
};

const TYPES = ["subpoena", "warrant", "emergency", "preservation"];

export default function LegalRequestsPage() {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({ organization: "", requestType: "subpoena", description: "", targetUserIds: "", referenceNumber: "" });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = filter ? `/api/admin/legal?status=${filter}` : "/api/admin/legal";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) { const data = await res.json(); setRequests(data.requests ?? []); }
    } finally { setLoading(false); }
  }, [filter]);

  React.useEffect(() => { load(); }, [load]);

  const createRequest = async () => {
    if (!form.organization || !form.description) { toast.error("Заполните обязательные поля"); return; }
    try {
      const res = await fetch("/api/admin/legal", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, targetUserIds: form.targetUserIds.split(",").map((s) => s.trim()).filter(Boolean) }),
      });
      if (res.ok) { toast.success("Создано"); setCreateOpen(false); setForm({ organization: "", requestType: "subpoena", description: "", targetUserIds: "", referenceNumber: "" }); load(); }
    } catch { toast.error("Ошибка"); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/legal/${id}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { toast.success("Обновлено"); load(); }
    } catch { toast.error("Ошибка"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Юридические запросы</h1>
        </div>
        <button type="button" onClick={() => setCreateOpen(!createOpen)} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Новый запрос
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setFilter(null)} className={cn("rounded-md border px-3 py-1.5 text-sm", !filter ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}>Все</button>
        {Object.entries(STATUS_MAP).map(([key, val]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} className={cn("rounded-md border px-3 py-1.5 text-sm", filter === key ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}>
            {val.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {createOpen && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <input placeholder="Организация *" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <select value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <textarea placeholder="Описание *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" rows={3} />
          <input placeholder="ID пользователей (через запятую)" value={form.targetUserIds} onChange={(e) => setForm({ ...form, targetUserIds: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <input placeholder="Референс" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <button type="button" onClick={createRequest} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Создать</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Нет запросов</div>
      ) : (
        <div className="space-y-2">
          {requests.map((r: any) => {
            const s = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
            const Icon = s.icon;
            return (
              <div key={r.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.organization}</p>
                    <p className="text-xs text-muted-foreground">{r.requestType} · {r.referenceNumber ?? "—"} · {new Date(r.createdAt).toLocaleDateString("ru")}</p>
                    <p className="mt-1 text-sm">{r.description}</p>
                    {r.targetUserIds.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">Цели: {r.targetUserIds.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("flex items-center gap-1 text-xs", s.color)}><Icon className="h-3 w-3" />{s.label}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {r.status === "pending" && (
                    <button type="button" onClick={() => updateStatus(r.id, "processing")} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">В обработку</button>
                  )}
                  {r.status === "processing" && (
                    <>
                      <button type="button" onClick={() => updateStatus(r.id, "completed")} className="rounded-md border border-emerald-500/30 px-2 py-1 text-xs text-emerald-500 hover:bg-emerald-500/10">Выполнено</button>
                      <button type="button" onClick={() => updateStatus(r.id, "rejected")} className="rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Отклонено</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
