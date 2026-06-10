"use client";

import * as React from "react";
import { X, Zap, TrendingUp, CheckCircle, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface BoostData {
  chatId: string;
  chatName: string;
  isOwner: boolean;
  boostLevel: number;
  boostCount: number;
  myBoost: { amount: number; createdAt: string } | null;
  nextLevelThreshold: number | null;
  benefits: string[];
  boostCost: number;
}

interface BoostModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  onBoosted?: () => void;
}

const LEVEL_NAMES = [
  "Нет уровня",
  "Бронзовый",
  "Серебряный",
  "Золотой",
  "Платиновый",
  "Бриллиантовый",
  "Легендарный",
  "Мифический",
  "Божественный",
  "Абсолютный",
];

const LEVEL_COLORS = [
  "text-gray-400",
  "text-amber-600",
  "text-gray-400",
  "text-yellow-500",
  "text-cyan-400",
  "text-blue-400",
  "text-purple-400",
  "text-pink-400",
  "text-red-400",
  "text-gradient",
];

function formatBalance(kopecks: number): string {
  const ton = kopecks / 100_000_000;
  return ton.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

export function BoostModal({ open, onClose, chatId, onBoosted }: BoostModalProps) {
  const [data, setData] = React.useState<BoostData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [boosting, setBoosting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/chats/${chatId}/boost`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast.error(d.error);
          onClose();
        } else {
          setData(d);
        }
      })
      .catch(() => toast.error("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [open, chatId, onClose]);

  const handleBoost = async () => {
    if (!data || boosting) return;
    setBoosting(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/boost`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Буст применён! -${result.deducted} NC`);
        setData((prev) =>
          prev
            ? {
                ...prev,
                boostLevel: result.boostLevel,
                boostCount: result.boostCount,
                nextLevelThreshold: result.nextLevelThreshold,
                benefits: result.benefits,
                myBoost: prev.myBoost
                  ? { ...prev.myBoost, amount: prev.myBoost.amount + 1 }
                  : { amount: 1, createdAt: new Date().toISOString() },
              }
            : null,
        );
        onBoosted?.();
      } else {
        if (result.error === "insufficient_balance") {
          toast.error("Недостаточно NC на балансе");
        } else if (result.error === "cannot_boost_own_channel") {
          toast.error("Нельзя бустить свой канал");
        } else {
          toast.error(result.error ?? "Ошибка буста");
        }
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setBoosting(false);
    }
  };

  if (!open) return null;

  const level = data?.boostLevel ?? 0;
  const levelName = LEVEL_NAMES[level] ?? "Неизвестно";
  const levelColor = LEVEL_COLORS[level] ?? "text-gray-400";
  const progress = data?.nextLevelThreshold
    ? ((data.boostCount / data.nextLevelThreshold) * 100).toFixed(0)
    : "100";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" /> Буст канала
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Загрузка...</div>
        ) : data ? (
          <div className="p-4 space-y-4">
            {/* Channel name */}
            <div className="text-center">
              <span className="text-sm text-muted-foreground">{data.chatName}</span>
            </div>

            {/* Current level */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <Crown className={cn("h-8 w-8 mx-auto mb-2", levelColor)} />
              <div className={cn("text-lg font-bold", levelColor)}>{levelName}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Уровень {level} / 9
              </div>
            </div>

            {/* Boost stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <div className="text-2xl font-bold text-primary">{data.boostCount}</div>
                <div className="text-xs text-muted-foreground">Всего бустов</div>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <div className="text-2xl font-bold text-primary">{data.myBoost?.amount ?? 0}</div>
                <div className="text-xs text-muted-foreground">Мои бусты</div>
              </div>
            </div>

            {/* Progress to next level */}
            {data.nextLevelThreshold && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Прогресс до уровня {level + 1}</span>
                  <span>{data.boostCount} / {data.nextLevelThreshold}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(Number(progress), 100)}%` }}
                  />
                </div>
              </div>
            )}
            {!data.nextLevelThreshold && level >= 9 && (
              <div className="text-center text-xs text-muted-foreground">
                Максимальный уровень достигнут!
              </div>
            )}

            {/* Benefits */}
            {data.benefits.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Привилегии уровня:</span>
                {data.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    {b}
                  </div>
                ))}
              </div>
            )}

            {/* Boost button */}
            {data.isOwner ? (
              <div className="text-center text-xs text-muted-foreground py-2">
                Вы владелец канала и не можете его бустить
              </div>
            ) : (
              <button
                type="button"
                onClick={handleBoost}
                disabled={boosting}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {boosting ? "Буст..." : `Буст за ${data.boostCost} NC`}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
