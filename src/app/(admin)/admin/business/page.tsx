"use client";

import * as React from "react";
import { Building, Plus, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

export default function BusinessPage() {
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({ userId: "", companyName: "", description: "", website: "" });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/business", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setAccounts(data.accounts ?? []); }
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const createAccount = async () => {
    if (!form.userId || !form.companyName) { toast.error("Заполните ID пользователя и название"); return; }
    try {
      const res = await fetch("/api/admin/business", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { toast.success("Создано"); setCreateOpen(false); setForm({ userId: "", companyName: "", description: "", website: "" }); load(); }
      else { const d = await res.json(); toast.error(d.error === "already_exists" ? "Уже существует" : "Ошибка"); }
    } catch { toast.error("Ошибка"); }
  };

  const toggleVerified = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/business/${id}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !current }),
      });
      if (res.ok) { toast.success(current ? "Снята верификация" : "Верифицировано"); load(); }
    } catch { toast.error("Ошибка"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить бизнес-аккаунт?")) return;
    try {
      const res = await fetch(`/api/admin/business/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Удалено"); load(); }
    } catch { toast.error("Ошибка"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Business Accounts</h1>
        </div>
        <button type="button" onClick={() => setCreateOpen(!createOpen)} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Создать
        </button>
      </div>

      {createOpen && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <input placeholder="ID пользователя" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <input placeholder="Название компании" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <input placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <input placeholder="Сайт" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <button type="button" onClick={createAccount} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Создать</button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : accounts.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Нет бизнес-аккаунтов</div>
      ) : (
        <div className="space-y-2">
          {accounts.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{a.companyName}</p>
                    {a.verified ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{a.user?.username ?? "—"} {a.website && `· ${a.website}`}
                  </p>
                  {a.description && <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => toggleVerified(a.id, a.verified)} className={cn("rounded-md px-2 py-1 text-xs", a.verified ? "text-yellow-500 hover:bg-yellow-500/10" : "text-emerald-500 hover:bg-emerald-500/10")}>
                  {a.verified ? "Снять" : "Верифицировать"}
                </button>
                <button type="button" onClick={() => remove(a.id)} className="rounded-md p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
