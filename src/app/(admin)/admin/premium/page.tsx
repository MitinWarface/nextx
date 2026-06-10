"use client";

import * as React from "react";
import { Crown, Users, TrendingUp, Check, X, Pencil } from "lucide-react";
import { toast } from "@/store/toast-store";

interface PremiumPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration: string;
  features: string[];
  active: boolean;
  subscriberCount: number;
}

interface PremiumStats {
  totalPremiumUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export default function AdminPremiumPage() {
  const [plans, setPlans] = React.useState<PremiumPlan[]>([]);
  const [stats, setStats] = React.useState<PremiumStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editingPlan, setEditingPlan] = React.useState<string | null>(null);
  const [editPrice, setEditPrice] = React.useState<string>("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/premium", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.data?.plans ?? data.plans ?? []);
        setStats(data.data?.stats ?? data.stats ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleSavePrice = async (planId: string) => {
    const price = Number(editPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Некорректная цена");
      return;
    }
    try {
      const res = await fetch("/api/admin/premium", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId, price }),
      });
      if (res.ok) {
        toast.success("Цена обновлена");
        setEditingPlan(null);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleToggleFeature = async (planId: string, feature: string, enabled: boolean) => {
    try {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return;
      const features = enabled
        ? [...plan.features, feature]
        : plan.features.filter((f) => f !== feature);
      const res = await fetch("/api/admin/premium", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId, features }),
      });
      if (res.ok) {
        toast.success("Функция обновлена");
        loadData();
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const durationLabel: Record<string, string> = {
    MONTHLY: "1 месяц",
    YEARLY: "1 год",
    TWO_YEARS: "2 года",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Премиум планы</h1>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Премиум пользователей</span>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-2 text-3xl font-bold">{stats.totalPremiumUsers.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Общая выручка</span>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-3xl font-bold">{stats.totalRevenue.toLocaleString("ru-RU")} ₽</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Выручка за месяц</span>
              <Crown className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="mt-2 text-3xl font-bold">{stats.monthlyRevenue.toLocaleString("ru-RU")} ₽</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Загрузка...</div>
      ) : plans.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">Нет планов</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border border-border p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {durationLabel[plan.duration] ?? plan.duration}
                  </p>
                </div>
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>

              <div className="flex items-baseline gap-1">
                {editingPlan === plan.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-28 rounded-md border border-input bg-transparent px-3 py-1.5 text-2xl font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleSavePrice(plan.id)}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPlan(null)}
                      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-3xl font-bold">{plan.price.toLocaleString("ru-RU")} ₽</span>
                    <button
                      type="button"
                      onClick={() => { setEditingPlan(plan.id); setEditPrice(String(plan.price)); }}
                      className="ml-2 rounded p-1 text-muted-foreground hover:bg-accent"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {plan.subscriberCount} подписчиков
              </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Функции</p>
                  <div className="space-y-1.5">
                    {["voice_to_text", "video_avatar", "ai_rewrite", "no_ads", "large_upload", "saved_tags", "task_lists", "premium_stickers", "premium_reactions", "premium_badge"].map((feature) => {
                      const enabled = plan.features.includes(feature);
                      return (
                        <label
                          key={feature}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => handleToggleFeature(plan.id, feature, e.target.checked)}
                            className="sr-only peer"
                          />
                          <span className={`flex h-5 w-5 items-center justify-center rounded border ${
                            enabled
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-transparent text-transparent"
                          }`}>
                            {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          </span>
                          <span className="text-muted-foreground">{feature.replace(/_/g, " ")}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
