"use client";

import * as React from "react";
import { X, Gift, Send, Heart, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface GiftItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: string;
  senderId?: string;
  senderName?: string;
  receivedAt?: string;
  isLimited?: boolean;
}

interface TradeItem {
  id: string;
  giftType: string;
  price: number;
  status: string;
  createdAt: string;
  seller: { id: string; displayName: string; avatarUrl: string | null };
}

interface MyGiftsModalProps {
  open: boolean;
  onClose: () => void;
}

export function MyGiftsModal({ open, onClose }: MyGiftsModalProps) {
  const [tab, setTab] = React.useState<"received" | "sent" | "market">("received");
  const [gifts, setGifts] = React.useState<any[]>([]);
  const [trades, setTrades] = React.useState<TradeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showSellModal, setShowSellModal] = React.useState(false);
  const [buyConfirm, setBuyConfirm] = React.useState<TradeItem | null>(null);
  const [buying, setBuying] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    if (tab === "market") {
      fetch("/api/gifts/trade", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setTrades(d.trades ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetch("/api/gifts?tab=" + tab, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setGifts(d.gifts ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, tab]);

  const handleBuy = async (trade: TradeItem) => {
    setBuying(true);
    try {
      const res = await fetch(`/api/gifts/trade/${trade.id}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setBuyConfirm(null);
        setTrades((prev) => prev.filter((t) => t.id !== trade.id));
        alert("Покупка успешна!");
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка покупки");
      }
    } finally {
      setBuying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[70vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Мои подарки</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex border-b border-border">
          <button type="button" onClick={() => setTab("received")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", tab === "received" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <Heart className="inline h-4 w-4 mr-1" /> Полученные
          </button>
          <button type="button" onClick={() => setTab("sent")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", tab === "sent" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <Send className="inline h-4 w-4 mr-1" /> Отправленные
          </button>
          <button type="button" onClick={() => setTab("market")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", tab === "market" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <Store className="inline h-4 w-4 mr-1" /> Рынок
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : tab === "market" ? (
            <>
              <div className="flex justify-end mb-3">
                <button onClick={() => setShowSellModal(true)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110">
                  Продать подарок
                </button>
              </div>
              {trades.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Нет товаров на продажу</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {trades.map((t) => (
                    <div key={t.id} className="flex flex-col items-center rounded-lg border border-border p-3 hover:bg-accent/50">
                      <span className="text-3xl">🎁</span>
                      <span className="mt-1 text-xs font-medium">{t.giftType}</span>
                      <span className="mt-0.5 text-xs text-primary font-semibold">{t.price} NC</span>
                      <button onClick={() => setBuyConfirm(t)} className="mt-2 w-full rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:brightness-110">
                        Купить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : gifts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет подарков</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {gifts.map((g: any) => (
                <div key={g.id} className="flex flex-col items-center rounded-lg border border-border p-3 hover:bg-accent/50">
                  <span className="text-3xl">{g.icon}</span>
                  <span className="mt-1 text-xs font-medium">{g.name}</span>
                  {g.rarity !== "common" && (
                    <span className="mt-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-500">{g.rarity}</span>
                  )}
                  {tab === "received" && g.senderName && (
                    <span className="mt-0.5 text-[10px] text-muted-foreground">от {g.senderName}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Buy confirmation */}
      {buyConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setBuyConfirm(null)}>
          <div className="flex w-full max-w-sm flex-col rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-sm font-semibold">Купить подарок?</h3>
            <p className="text-sm text-muted-foreground mb-1">{buyConfirm.giftType}</p>
            <p className="text-sm font-semibold text-primary mb-3">{buyConfirm.price} NC</p>
            <div className="flex gap-2">
              <button onClick={() => setBuyConfirm(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Отмена</button>
              <button onClick={() => handleBuy(buyConfirm)} disabled={buying} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
                {buying ? "..." : "Купить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell modal */}
      {showSellModal && (
        <SellGiftModal
          onClose={() => setShowSellModal(false)}
          onSold={(trade) => {
            setShowSellModal(false);
            setTrades((prev) => [trade, ...prev]);
          }}
        />
      )}
    </div>
  );
}

function SellGiftModal({ onClose, onSold }: { onClose: () => void; onSold: (trade: TradeItem) => void }) {
  const [giftType, setGiftType] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSell = async () => {
    if (!giftType || !price) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gifts/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ giftType, price: parseInt(price) }),
      });
      if (res.ok) {
        const data = await res.json();
        onSold(data.trade);
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex w-full max-w-sm flex-col rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold">Продать подарок</h3>
        <input value={giftType} onChange={(e) => setGiftType(e.target.value)} placeholder="Тип подарка (название)" className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Цена (NC)" className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Отмена</button>
          <button onClick={handleSell} disabled={saving || !giftType || !price} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
            {saving ? "..." : "Продать"}
          </button>
        </div>
      </div>
    </div>
  );
}
