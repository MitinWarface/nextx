"use client";

import * as React from "react";
import { HardDrive, Trash2, Filter } from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

export default function ContentStoragePage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [categoryStats, setCategoryStats] = React.useState<any[]>([]);
  const [growthData, setGrowthData] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = categoryFilter ? `/api/admin/content?category=${categoryFilter}` : "/api/admin/content";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setCategoryStats(data.categoryStats ?? []);
        setGrowthData(data.growthData ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  React.useEffect(() => { load(); }, [load]);

  const deleteItem = async (id: string) => {
    if (!confirm("Удалить файл?")) return;
    try {
      const res = await fetch(`/api/admin/content/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Удалён"); load(); }
    } catch { toast.error("Ошибка"); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const categories = ["uploads", "avatars", "stories", "voice", "documents"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HardDrive className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Хранилище контента</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Всего файлов</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        {categoryStats.map((s: any) => (
          <div key={s.category} className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.category}</p>
            <p className="text-2xl font-bold">{s._count}</p>
            <p className="text-xs text-muted-foreground">{formatSize(Number(s._sum?.fileSize ?? 0))}</p>
          </div>
        ))}
      </div>

      {/* Growth Chart */}
      {growthData.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Рост за 14 дней</h3>
          <div className="flex items-end gap-1 h-32">
            {growthData.map((d: any) => {
              const maxCount = Math.max(...growthData.map((x: any) => Number(x.count)));
              const height = maxCount > 0 ? (Number(d.count) / maxCount) * 100 : 0;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{Number(d.count)}</span>
                  <div
                    className="w-full rounded-t bg-primary/60 transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(d.day).toLocaleDateString("ru", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setCategoryFilter(null)} className={cn("rounded-md border px-3 py-1.5 text-sm", !categoryFilter ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}>
          Все
        </button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCategoryFilter(c)} className={cn("rounded-md border px-3 py-1.5 text-sm", categoryFilter === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}>
            {c}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Нет файлов</div>
      ) : (
        <div className="space-y-1">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.user?.username ?? "—"} · {item.category} · {formatSize(item.fileSize)} · {new Date(item.createdAt).toLocaleDateString("ru")}
                </p>
              </div>
              <button type="button" onClick={() => deleteItem(item.id)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
