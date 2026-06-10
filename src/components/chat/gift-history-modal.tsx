"use client";

import * as React from "react";
import { X, Send, Heart, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GiftHistoryItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  rarity: string;
  status: string;
  message: string | null;
  createdAt: string;
  sender?: { id: string; displayName: string; avatarUrl: string | null };
  receiver?: { id: string; displayName: string; avatarUrl: string | null };
}

interface GiftHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "bg-gray-500/10 text-gray-500",
  rare: "bg-blue-500/10 text-blue-500",
  epic: "bg-purple-500/10 text-purple-500",
  legendary: "bg-amber-500/10 text-amber-500",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

export function GiftHistoryModal({ open, onClose }: GiftHistoryModalProps) {
  const [tab, setTab] = React.useState<"received" | "sent">("received");
  const [gifts, setGifts] = React.useState<GiftHistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedGift, setSelectedGift] = React.useState<GiftHistoryItem | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/users/me/gifts/history?tab=${tab}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setGifts(d.gifts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, tab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[75vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">История подарков</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setTab("received")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === "received" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart className="inline h-4 w-4 mr-1" /> Полученные
          </button>
          <button
            type="button"
            onClick={() => setTab("sent")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === "sent" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Send className="inline h-4 w-4 mr-1" /> Отправленные
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : gifts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {tab === "received" ? "Нет полученных подарков" : "Нет отправленных подарков"}
            </div>
          ) : (
            <div className="space-y-2">
              {gifts.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGift(g)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{g.name}</span>
                      <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium", RARITY_COLORS[g.rarity] ?? RARITY_COLORS.common)}>
                        {RARITY_LABELS[g.rarity] ?? g.rarity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {tab === "received" && g.sender ? `от ${g.sender.displayName}` : ""}
                      {tab === "sent" && g.receiver ? `для ${g.receiver.displayName}` : ""}
                      {g.message ? ` · ${g.message}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="text-xs text-muted-foreground block">{new Date(g.createdAt).toLocaleDateString("ru")}</span>
                    <span className="text-xs text-primary font-medium">{g.price > 0 ? `${g.price / 100_000_000} NC` : "Бесплатно"}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gift detail / chain modal */}
      {selectedGift && (
        <GiftChainModal gift={selectedGift} onClose={() => setSelectedGift(null)} />
      )}
    </div>
  );
}

function GiftChainModal({ gift, onClose }: { gift: GiftHistoryItem; onClose: () => void }) {
  const [chain, setChain] = React.useState<Array<{ id: string; displayName: string; avatarUrl: string | null }>>([]);
  const [loadingChain, setLoadingChain] = React.useState(true);

  React.useEffect(() => {
    setLoadingChain(true);
    fetch(`/api/gifts?tab=received`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        // Build chain from sent/received data — for demo, show sender → receiver
        const receivers = (d.received ?? []) as GiftHistoryItem[];
        const senders = (d.sent ?? []) as GiftHistoryItem[];
        const all = [...receivers, ...senders];
        const related = all.filter((g) => g.name === gift.name);
        const chainMap = new Map<string, { id: string; displayName: string; avatarUrl: string | null }>();
        // Add creator (first sender)
        if (gift.sender) chainMap.set(gift.sender.id, gift.sender);
        if (gift.receiver) chainMap.set(gift.receiver.id, gift.receiver);
        related.forEach((g) => {
          if (g.sender) chainMap.set(g.sender.id, g.sender);
          if (g.receiver) chainMap.set(g.receiver.id, g.receiver);
        });
        setChain(Array.from(chainMap.values()));
      })
      .catch(() => {})
      .finally(() => setLoadingChain(false));
  }, [gift]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Цепочка владения</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4 flex flex-col items-center gap-2">
          <span className="text-4xl">{gift.emoji}</span>
          <span className="text-sm font-medium">{gift.name}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", RARITY_COLORS[gift.rarity] ?? RARITY_COLORS.common)}>
            {RARITY_LABELS[gift.rarity] ?? gift.rarity}
          </span>
          {gift.price > 0 && (
            <span className="text-xs text-primary font-medium">{gift.price / 100_000_000} NC</span>
          )}
        </div>
        {loadingChain ? (
          <div className="py-4 text-center text-xs text-muted-foreground">Загрузка цепочки...</div>
        ) : chain.length > 0 ? (
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {chain.map((u, i) => (
              <React.Fragment key={u.id}>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-muted-foreground max-w-[60px] truncate">{u.displayName}</span>
                </div>
                {i < chain.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">Цепочка недоступна</p>
        )}
        {gift.message && (
          <div className="mt-3 rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">{gift.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
