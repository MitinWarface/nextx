"use client";

import * as React from "react";
import { X, TrendingUp, TrendingDown, Gift, MessageSquare, Users, Zap, ShoppingCart, Crown, Rocket, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface EconomyData {
  balance: number;
  totalEarned: number;
  earningsBySource: Record<string, { total: number; count: number }>;
  transactions: {
    id: string;
    type: string;
    source: string;
    amount: number;
    balanceAfter: number;
    details: string | null;
    date: string;
  }[];
  hasMore: boolean;
}

interface EconomyModalProps {
  open: boolean;
  onClose: () => void;
}

const SOURCE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  daily_login: { label: "Ежедневный вход", icon: Zap, color: "text-yellow-500" },
  message: { label: "Сообщения", icon: MessageSquare, color: "text-blue-500" },
  referral: { label: "Реферал", icon: Users, color: "text-green-500" },
  spin: { label: "Спин колеса", icon: TrendingUp, color: "text-purple-500" },
  quest: { label: "Квест", icon: Rocket, color: "text-orange-500" },
  gift: { label: "Подарок", icon: Gift, color: "text-pink-500" },
  premium: { label: "Premium", icon: Crown, color: "text-amber-500" },
  boost: { label: "Буст", icon: TrendingUp, color: "text-teal-500" },
  marketplace: { label: "Маркет", icon: ShoppingCart, color: "text-indigo-500" },
  admin: { label: "Админ", icon: Zap, color: "text-red-500" },
};

export function EconomyModal({ open, onClose }: EconomyModalProps) {
  const [data, setData] = React.useState<EconomyData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/economy", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  const earnMethods = [
    { icon: Zap, label: "Ежедневный вход", desc: "1 NC за каждый вход" },
    { icon: MessageSquare, label: "Отправка сообщений", desc: "NC за активность" },
    { icon: Users, label: "Приглашение друзей", desc: "Бонус за реферала" },
    { icon: TrendingUp, label: "Ежедневный спин", desc: "1-50 NC" },
  ];

  const spendMethods = [
    { icon: Gift, label: "Подарки", desc: "Отправляйте подарки" },
    { icon: Crown, label: "Premium", desc: "Расширенные функции" },
    { icon: Rocket, label: "Буст канала", desc: "Продвижение контента" },
    { icon: ShoppingCart, label: "Маркет", desc: "Цифровые товары" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-md flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold">Экономика NC</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : data ? (
            <div className="space-y-4">
              {/* Balance */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <p className="text-xs text-muted-foreground">Баланс</p>
                <p className="text-3xl font-bold text-primary">{data.balance} NC</p>
                <p className="text-xs text-muted-foreground">Всего заработано: {data.totalEarned} NC</p>
              </div>

              {/* Earn methods */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-green-600 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Заработать
                </h3>
                <div className="space-y-1.5">
                  {earnMethods.map((m) => {
                    const Icon = m.icon;
                    const src = SOURCE_LABELS[m.icon === TrendingUp ? "spin" : m.icon === Zap ? "daily_login" : m.icon === MessageSquare ? "message" : "referral"];
                    const stats = data.earningsBySource[m.icon === TrendingUp ? "spin" : m.icon === Zap ? "daily_login" : m.icon === MessageSquare ? "message" : "referral"];
                    return (
                      <div key={m.label} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                        <Icon className={cn("h-5 w-5", src?.color ?? "text-muted-foreground")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.desc}</p>
                        </div>
                        {stats && (
                          <span className="text-xs text-muted-foreground">+{stats.total} NC</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spend methods */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-red-500 flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4" /> Потратить
                </h3>
                <div className="space-y-1.5">
                  {spendMethods.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transaction log */}
              <div>
                <h3 className="mb-2 text-sm font-semibold flex items-center gap-1.5">
                  <History className="h-4 w-4" /> История
                </h3>
                {data.transactions.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Нет транзакций</p>
                ) : (
                  <div className="space-y-1">
                    {data.transactions.slice(0, 20).map((tx) => {
                      const src = SOURCE_LABELS[tx.source];
                      const Icon = src?.icon ?? Zap;
                      return (
                        <div key={tx.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                          <Icon className={cn("h-4 w-4 shrink-0", src?.color ?? "text-muted-foreground")} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium">{src?.label ?? tx.source}</p>
                            {tx.details && <p className="text-[10px] text-muted-foreground truncate">{tx.details}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn("text-xs font-semibold", tx.type === "earn" ? "text-green-600" : "text-red-500")}>
                              {tx.type === "earn" ? "+" : "-"}{tx.amount} NC
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(tx.date).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
