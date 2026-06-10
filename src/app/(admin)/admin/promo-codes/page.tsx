"use client";

import * as React from "react";
import { Tag, Plus, Copy, Check, X } from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

interface PromoCode {
  id: string;
  code: string;
  discount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  planId: string | null;
  plan?: { id: string; name: string } | null;
  createdAt: string;
}

export default function PromoCodesPage() {
  const [codes, setCodes] = React.useState<PromoCode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newCode, setNewCode] = React.useState("");
  const [newDiscount, setNewDiscount] = React.useState(10);
  const [newMaxUses, setNewMaxUses] = React.useState("");
  const [newExpires, setNewExpires] = React.useState("");
  const [copied, setCopied] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newCode.trim()) return;
    const body: any = { code: newCode.trim(), discount: newDiscount };
    if (newMaxUses) body.maxUses = Number(newMaxUses);
    if (newExpires) body.expiresAt = new Date(newExpires).toISOString();

    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success("Промокод создан");
      setNewCode("");
      setNewDiscount(10);
      setNewMaxUses("");
      setNewExpires("");
      setShowCreate(false);
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message ?? "Ошибка");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Промокоды</h1>
          <p className="text-sm text-muted-foreground">Создание и управление промокодами</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Код</label>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="SUMMER2024"
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Скидка (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={newDiscount}
                onChange={(e) => setNewDiscount(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Макс. использований</label>
              <input
                type="number"
                min={1}
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder="Без ограничений"
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Срок действия</label>
              <input
                type="datetime-local"
                value={newExpires}
                onChange={(e) => setNewExpires(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={create}
            className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground"
          >
            Создать промокод
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Скидка</th>
                <th className="px-4 py-3">Использовано</th>
                <th className="px-4 py-3">Срок</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const isMaxed = c.maxUses !== null && c.usedCount >= c.maxUses;
                const status = !c.isActive ? "Неактивен" : isExpired ? "Истёк" : isMaxed ? "Лимит" : "Активен";
                const statusColor = !c.isActive ? "text-gray-500" : isExpired ? "text-red-500" : isMaxed ? "text-yellow-500" : "text-emerald-500";

                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <code className="rounded bg-muted px-2 py-0.5 text-sm font-medium">{c.code}</code>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.discount}%</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("ru") : "Бессрочно"}
                    </td>
                    <td className={cn("px-4 py-3 text-xs font-medium", statusColor)}>{status}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => copyCode(c.code)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent"
                      >
                        {copied === c.code ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {codes.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Нет промокодов</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
