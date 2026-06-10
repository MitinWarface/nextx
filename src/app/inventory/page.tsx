"use client";

import * as React from "react";
import { Gift, Sparkles, Image, Award, Palette, Layers, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

type Tab = "gifts" | "stickers" | "frames" | "badges" | "backgrounds";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  type: string;
  rarity: string;
  price: number;
  from: string;
  date: string;
}

interface StickerPack {
  id: string;
  name: string;
  emoji: string | null;
  isPremium: boolean;
  stickerCount: number;
}

interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string;
}

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "gifts", label: "Подарки", icon: Gift },
  { key: "stickers", label: "Стикеры", icon: Sparkles },
  { key: "frames", label: "Рамки", icon: Image },
  { key: "badges", label: "Значки", icon: Award },
  { key: "backgrounds", label: "Фоны", icon: Palette },
];

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

export default function InventoryPage() {
  const [tab, setTab] = React.useState<Tab>("gifts");
  const [gifts, setGifts] = React.useState<GiftItem[]>([]);
  const [stickerPacks, setStickerPacks] = React.useState<StickerPack[]>([]);
  const [badges, setBadges] = React.useState<Badge[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/users/me/inventory", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setGifts(d.gifts ?? []);
        setStickerPacks(d.stickerPacks ?? []);
        setBadges(d.badges ?? []);
      })
      .catch(() => toast.error("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Package className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Инвентарь</h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4">
        <div className="flex gap-1 overflow-x-auto border-b border-border py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  tab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="py-4">
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : (
            <>
              {tab === "gifts" && (
                <div className="space-y-2">
                  {gifts.length === 0 ? (
                    <EmptyState text="Нет подарков" />
                  ) : (
                    gifts.map((g) => (
                      <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <span className="text-2xl">{g.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{g.name}</p>
                          <p className="text-xs text-muted-foreground">
                            от {g.from} · <span className={RARITY_COLORS[g.rarity] ?? ""}>{g.rarity}</span>
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{g.price} NC</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "stickers" && (
                <div className="space-y-2">
                  {stickerPacks.length === 0 ? (
                    <EmptyState text="Нет стикерпаков" />
                  ) : (
                    stickerPacks.map((sp) => (
                      <div key={sp.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <span className="text-2xl">{sp.emoji ?? "🎨"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{sp.name}</p>
                          <p className="text-xs text-muted-foreground">{sp.stickerCount} стикеров</p>
                        </div>
                        {sp.isPremium && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">Premium</span>
                        )}
                        <button
                          type="button"
                          className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
                        >
                          Установить
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "frames" && <EmptyState text="Нет рамок. Получите их в магазине профиля." />}

              {tab === "badges" && (
                <div className="space-y-2">
                  {badges.length === 0 ? (
                    <EmptyState text="Нет значков. Выполняйте достижения!" />
                  ) : (
                    badges.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <span className="text-2xl">{b.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.description}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(b.unlockedAt).toLocaleDateString("ru")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "backgrounds" && <EmptyState text="Нет фонов. Купите в магазине." />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-20 text-center text-sm text-muted-foreground">{text}</div>
  );
}
