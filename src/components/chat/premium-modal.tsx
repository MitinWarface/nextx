"use client";

import * as React from "react";
import { X, Crown, Mic, Video, Sparkles, Tag, Shield, Zap, Image, Brain, ListTodo, Heart, Gauge, Folder, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

interface Plan {
  id: string;
  name: string;
  tier: string;
  durationDays: number;
  priceKopecks: number;
  features: { code: string; name: string }[];
}

const CATEGORIES = [
  {
    title: "Ограничения и лимиты",
    icon: <Zap className="h-5 w-5" />,
    features: [
      { code: "large_upload", name: "Большие файлы до 25 МБ", desc: "Бесплатно — 10 МБ" },
      { code: "no_ads", name: "Без рекламы", desc: "Полное отсутствие рекламы" },
    ],
  },
  {
    title: "Персонализация",
    icon: <Image className="h-5 w-5" />,
    features: [
      { code: "video_avatar", name: "Видеоаватары", desc: "Аватарка из видео вместо картинки" },
      { code: "premium_badge", name: "Premium-значок", desc: "Звёздочка рядом с именем" },
      { code: "premium_stickers", name: "Эксклюзивные стикеры", desc: "Доступ к премиум-пакетам" },
      { code: "premium_reactions", name: "Любые реакции", desc: "Любой эмодзи + несколько реакций" },
    ],
  },
  {
    title: "Приватность",
    icon: <Shield className="h-5 w-5" />,
    features: [
      { code: "saved_tags", name: "Теги в Избранном", desc: "Организуйте сохранённые сообщения" },
      { code: "task_lists", name: "Списки задач", desc: "Отдельный тип сообщения для задач" },
    ],
  },
  {
    title: "AI и голос",
    icon: <Brain className="h-5 w-5" />,
    features: [
      { code: "voice_to_text", name: "Расшифровка голосовых", desc: "AI конвертирует голос в текст" },
      { code: "ai_rewrite", name: "AI-переписывание", desc: "Перевод, сокращение, исправление стиля" },
    ],
  },
  {
    title: "Производительность",
    icon: <Gauge className="h-5 w-5" />,
    features: [
      { code: "large_upload", name: "Увеличенный лимит файлов", desc: "Загружайте файлы до 4 ГБ" },
    ],
  },
  {
    title: "Организация",
    icon: <Folder className="h-5 w-5" />,
    features: [
      { code: "saved_tags", name: "Теги в Избранном", desc: "Организуйте сохранённые сообщения" },
      { code: "task_lists", name: "Списки задач", desc: "Отдельный тип сообщения для задач" },
    ],
  },
];

const TIER_BADGE: Record<string, { label: string; classes: string }> = {
  FREE: { label: "FREE", classes: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  PLUS: { label: "PLUS", classes: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  PREMIUM: { label: "PREMIUM", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  BUSINESS: { label: "BUSINESS", classes: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

function formatPrice(kopecks: number): string {
  return `${Math.round(kopecks / 100)} ₽`;
}

function formatDuration(days: number): string {
  if (days >= 365) {
    const y = Math.floor(days / 365);
    return y === 1 ? "1 год" : `${y} года`;
  }
  if (days >= 30) {
    const m = Math.floor(days / 30);
    return m === 1 ? "1 мес." : `${m} мес.`;
  }
  return `${days} дн.`;
}

export function PremiumModal({ open, onClose }: PremiumModalProps) {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activating, setActivating] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"features" | "plans">("features");
  const [myFeatures, setMyFeatures] = React.useState<string[]>([]);

  const [promoOpen, setPromoOpen] = React.useState(false);
  const [promoInput, setPromoInput] = React.useState("");
  const [promoLoading, setPromoLoading] = React.useState(false);
  const [appliedPromo, setAppliedPromo] = React.useState<{
    discount: number;
    discountedPrice: number;
    promoCode: { id: string; code: string; discount: number };
  } | null>(null);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/premium/plans", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? d.data?.plans ?? []))
      .catch(() => {});
    fetch("/api/premium", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMyFeatures(d.features ?? d.data?.features ?? []))
      .catch(() => {});
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setPromoInput("");
      setAppliedPromo(null);
      setPromoError(null);
      setSelectedPlanId(null);
      setPromoOpen(false);
    }
  }, [open]);

  const handleApplyPromo = async (planId: string) => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setAppliedPromo(null);
    try {
      const res = await fetch("/api/premium/promo-apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), planId }),
      });
      if (res.ok) {
        const d = await res.json();
        setAppliedPromo(d.data ?? d);
      } else {
        const err = await res.json();
        setPromoError(err.message ?? err.error ?? "Промокод недействителен");
      }
    } catch {
      setPromoError("Ошибка сети");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleActivate = async (planId: string) => {
    setActivating(planId);
    try {
      const payload: { planId: string; promoCode?: string } = { planId };
      if (appliedPromo && selectedPlanId === planId) {
        payload.promoCode = appliedPromo.promoCode.code;
      }
      const res = await fetch("/api/premium/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        const url = d.data?.confirmation_url ?? d.confirmation_url;
        if (url) {
          window.location.href = url;
        } else {
          alert("Ошибка: нет ссылки на оплату");
        }
      } else {
        const err = await res.json();
        alert(err.message ?? err.error ?? "Ошибка создания платежа");
      }
    } catch {
      alert("Ошибка сети");
    } finally {
      setActivating(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white">
          <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full p-1 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8" />
            <div>
              <h2 className="text-xl font-bold">NextX Premium</h2>
              <p className="text-sm text-white/80">Расширенные возможности</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", activeTab === "features" ? "border-amber-500 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            Возможности
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", activeTab === "plans" ? "border-amber-500 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            Тарифы
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === "features" && (
            <div className="space-y-5">
              {CATEGORIES.map((cat) => (
                <div key={cat.title}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="text-amber-500">{cat.icon}</span>
                    {cat.title}
                  </div>
                  <div className="space-y-1.5">
                    {cat.features.map((f) => {
                      const has = myFeatures.includes(f.code);
                      return (
                        <div key={f.code} className={cn("flex items-center gap-3 rounded-lg border p-3 transition-colors", has ? "border-amber-500/30 bg-amber-500/5" : "border-border")}>
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", has ? "bg-amber-500/20 text-amber-600" : "bg-muted text-muted-foreground")}>
                            {has ? <Sparkles className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{f.desc}</p>
                          </div>
                          {has && <span className="shrink-0 text-xs font-medium text-amber-600">Активно</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "plans" && (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-border p-4 transition-colors hover:border-amber-500/50">
                  <div className="mb-3 flex items-baseline justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        {plan.tier && (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", TIER_BADGE[plan.tier]?.classes ?? TIER_BADGE.FREE.classes)}>
                            {TIER_BADGE[plan.tier]?.label ?? plan.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDuration(plan.durationDays)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-amber-600">{formatPrice(plan.priceKopecks)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(Math.round(plan.priceKopecks / (plan.durationDays / 30)))} в мес.
                      </p>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {plan.features.map((f) => (
                      <span key={f.code} className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                        {f.name}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlanId === plan.id) {
                        setSelectedPlanId(null);
                        setAppliedPromo(null);
                        setPromoError(null);
                        setPromoInput("");
                        setPromoOpen(false);
                      } else {
                        setSelectedPlanId(plan.id);
                        setAppliedPromo(null);
                        setPromoError(null);
                        setPromoInput("");
                        setPromoOpen(true);
                      }
                    }}
                    className="mb-3 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-amber-500/50 hover:text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {appliedPromo && selectedPlanId === plan.id
                        ? `Промокод: ${appliedPromo.promoCode.code}`
                        : "Есть промокод?"}
                    </span>
                    {selectedPlanId === plan.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {selectedPlanId === plan.id && promoOpen && (
                    <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="Введите промокод"
                          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleApplyPromo(plan.id);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyPromo(plan.id)}
                          disabled={promoLoading || !promoInput.trim()}
                          className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                        >
                          {promoLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Применить"
                          )}
                        </button>
                      </div>
                      {promoError && (
                        <p className="mt-2 text-xs text-red-500">{promoError}</p>
                      )}
                      {appliedPromo && (
                        <p className="mt-2 text-xs text-emerald-600">
                          Скидка: -{appliedPromo.discount}% → Новая цена: {formatPrice(appliedPromo.discountedPrice)}
                        </p>
                      )}
                    </div>
                  )}

                  {appliedPromo && selectedPlanId === plan.id && (
                    <div className="mb-3 flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground line-through">{formatPrice(plan.priceKopecks)}</span>
                      <span className="text-lg font-bold text-emerald-600">{formatPrice(appliedPromo.discountedPrice)}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleActivate(plan.id)}
                    disabled={activating === plan.id}
                    className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {activating === plan.id ? "Активация..." : "Подключить"}
                  </button>
                </div>
              ))}
              {plans.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Тарифы загружаются...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
