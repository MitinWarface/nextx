"use client";

import * as React from "react";
import { Gift, Star, ArrowRightLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  rarity: string;
  price: number;
  receivedAt: string;
  sender?: { id: string; displayName: string; avatarUrl?: string | null };
}

interface GiftShowcaseProps {
  userId: string;
  isOwner?: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: "border-border bg-card",
  rare: "border-blue-400/40 bg-blue-500/10",
  epic: "border-purple-400/40 bg-purple-500/10",
  legendary: "border-amber-400/40 bg-amber-500/10",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

export function GiftShowcase({ userId, isOwner = false }: GiftShowcaseProps) {
  const [gifts, setGifts] = React.useState<GiftItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showcaseCount, setShowcaseCount] = React.useState(0);

  React.useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/users/${userId}/public`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setGifts(d.gifts ?? []);
        setShowcaseCount(d.giftShowcaseCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Gift className="h-3.5 w-3.5" /> Подарки
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const showcaseGifts = gifts.slice(0, showcaseCount || 6);

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Gift className="h-3.5 w-3.5" /> Подарки
        {gifts.length > 0 && (
          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
            {gifts.length}
          </span>
        )}
      </div>
      {showcaseGifts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {isOwner ? "Отправьте подарок, чтобы он появился здесь" : "Нет подарков"}
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {showcaseGifts.map((gift) => (
            <div
              key={gift.id}
              className={cn(
                "group relative flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border transition-all hover:scale-105",
                RARITY_COLORS[gift.rarity] ?? RARITY_COLORS.common,
              )}
              title={`${gift.name} (${RARITY_LABELS[gift.rarity] ?? gift.rarity})`}
            >
              <span className="text-2xl leading-none">{gift.emoji}</span>
              <span className="mt-0.5 max-w-[56px] truncate text-[9px] font-medium text-muted-foreground">
                {gift.name}
              </span>
              {/* Rarity indicator dot */}
              <div
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                  gift.rarity === "legendary" ? "bg-amber-400" :
                  gift.rarity === "epic" ? "bg-purple-400" :
                  gift.rarity === "rare" ? "bg-blue-400" :
                  "bg-muted-foreground/30",
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
