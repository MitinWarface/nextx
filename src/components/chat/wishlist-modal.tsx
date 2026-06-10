"use client";

import * as React from "react";
import { X, Heart, Trash2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface WishlistItem {
  giftName: string;
  emoji: string;
  price: number;
  rarity: string;
  addedAt: string;
}

interface WishlistModalProps {
  open: boolean;
  onClose: () => void;
  onGiftSelect?: (giftName: string) => void;
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

export function WishlistModal({ open, onClose, onGiftSelect }: WishlistModalProps) {
  const [wishlist, setWishlist] = React.useState<WishlistItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/users/me/wishlist", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setWishlist(d.wishlist ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleRemove = async (giftName: string) => {
    try {
      const res = await fetch(`/api/users/me/wishlist?giftName=${encodeURIComponent(giftName)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.wishlist ?? []);
        toast.success("Удалено из вишлиста");
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[70vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Мой вишлист
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : wishlist.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Heart className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Вишлист пуст</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Добавляйте подарки из каталога, чтобы другие знали, что вы хотите
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {wishlist.map((item) => (
                <div
                  key={item.giftName}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/30"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.giftName}</span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", RARITY_COLORS[item.rarity] ?? RARITY_COLORS.common)}>
                        {RARITY_LABELS[item.rarity] ?? item.rarity}
                      </span>
                    </div>
                    <span className="text-xs text-primary font-medium">
                      {item.price > 0 ? `${item.price / 100_000_000} NC` : "Бесплатно"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {onGiftSelect && (
                      <button
                        type="button"
                        onClick={() => {
                          onGiftSelect(item.giftName);
                          onClose();
                        }}
                        className="rounded-md bg-primary/10 p-1.5 text-primary hover:bg-primary/20"
                        title="Отправить"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.giftName)}
                      className="rounded-md bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
                      title="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
