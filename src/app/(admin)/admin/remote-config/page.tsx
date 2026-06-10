"use client";

import * as React from "react";
import { Settings, Plus, Trash2, Save } from "lucide-react";
import { toast } from "@/store/toast-store";

export default function RemoteConfigPage() {
  const [configs, setConfigs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editKey, setEditKey] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/remote-config", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setConfigs(data.configs ?? []); }
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const save = async (key: string, value: any, description?: string) => {
    try {
      const res = await fetch("/api/admin/remote-config", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, description }),
      });
      if (res.ok) { toast.success("Сохранено"); setEditKey(null); load(); }
    } catch { toast.error("Ошибка"); }
  };

  const create = async () => {
    if (!newKey.trim()) { toast.error("Введите ключ"); return; }
    let parsed: any;
    try { parsed = JSON.parse(newValue || "{}"); } catch { toast.error("Невалидный JSON"); return; }
    await save(newKey.trim(), parsed, newDesc || undefined);
    setNewKey(""); setNewValue(""); setNewDesc("");
  };

  const remove = async (key: string) => {
    if (!confirm(`Удалить ${key}?`)) return;
    try {
      const res = await fetch(`/api/admin/remote-config/${key}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Удалено"); load(); }
    } catch { toast.error("Ошибка"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Remote Config</h1>
      </div>

      {/* Create new */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Добавить конфигурацию</h2>
        <div className="grid grid-cols-3 gap-2">
          <input placeholder="Ключ" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <input placeholder='JSON значение (например: {"value": 100})' value={newValue} onChange={(e) => setNewValue(e.target.value)} className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <input placeholder="Описание" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
        </div>
        <button type="button" onClick={create} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : configs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Нет конфигураций</div>
      ) : (
        <div className="space-y-2">
          {configs.map((c: any) => (
            <div key={c.key} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono font-medium">{c.key}</p>
                  {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  {editKey === c.key ? (
                    <div className="mt-2 space-y-2">
                      <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono" rows={3} />
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Описание" className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { let v; try { v = JSON.parse(editValue); } catch { toast.error("Невалидный JSON"); return; } save(c.key, v, editDesc); }} className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"><Save className="h-3 w-3" /> Сохранить</button>
                        <button type="button" onClick={() => setEditKey(null)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <pre className="mt-1 max-h-20 overflow-auto rounded bg-muted/50 p-2 text-xs">{JSON.stringify(c.value, null, 2)}</pre>
                  )}
                </div>
                <div className="flex gap-1 ml-3">
                  {editKey !== c.key && (
                    <button type="button" onClick={() => { setEditKey(c.key); setEditValue(JSON.stringify(c.value, null, 2)); setEditDesc(c.description ?? ""); }}
                      className="rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10">Изменить</button>
                  )}
                  <button type="button" onClick={() => remove(c.key)} className="rounded-md p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
