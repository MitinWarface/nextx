"use client";

import * as React from "react";
import { X, Send, Gift, Heart } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/store/toast-store";

interface GiftCatalogItem {
  name: string;
  emoji: string;
  price: number;
  label?: string;
}

interface GiftModalProps {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string | null;
  onSent?: () => void;
}

export function GiftModal({ open, onClose, recipientId, recipientName, recipientAvatar, onSent }: GiftModalProps) {
  const [catalog, setCatalog] = React.useState<GiftCatalogItem[]>([]);
  const [selected, setSelected] = React.useState<GiftCatalogItem | null>(null);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [wishlistItems, setWishlistItems] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/gifts/catalog", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCatalog(d.catalog ?? []))
      .catch(() => {});
    fetch("/api/users/me/wishlist", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const names = (d.wishlist ?? []).map((w: { giftName: string }) => w.giftName);
        setWishlistItems(new Set(names));
      })
      .catch(() => {});
    setSelected(null);
    setMessage("");
  }, [open]);

  const handleAddToWishlist = async (giftName: string) => {
    try {
      const res = await fetch("/api/users/me/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ giftName }),
      });
      if (res.ok) {
        setWishlistItems((prev) => new Set(prev).add(giftName));
        toast.success("Добавлено в вишлист");
      } else {
        const err = await res.json();
        if (err.error === "already_in_wishlist") {
          toast.info("Уже в вишлисте");
        } else {
          toast.error("Ошибка");
        }
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ receiverId: recipientId, giftType: selected.name, message: message || undefined }),
      });
      if (res.ok) {
        toast.success(`Подарок ${selected.emoji} отправлен!`);
        onSent?.();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error ?? err.message ?? "Ошибка");
      }
    } catch { toast.error("Ошибка сети"); } finally { setSending(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Отправить подарок</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Avatar name={recipientName} src={recipientAvatar ?? null} size="md" />
          <span className="text-sm font-medium">{recipientName}</span>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {catalog.map((g) => (
            <div
              key={g.name}
              className={`relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${selected?.name === g.name ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"}`}
            >
              <button
                type="button"
                onClick={() => setSelected(g)}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{g.label ?? `${g.price} NC`}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToWishlist(g.name);
                }}
                className={`absolute top-1 right-1 rounded-full p-1 transition-colors ${
                  wishlistItems.has(g.name)
                    ? "text-pink-500 hover:text-pink-600"
                    : "text-muted-foreground/50 hover:text-pink-500"
                }`}
                title={wishlistItems.has(g.name) ? "В вишлисте" : "Добавить в вишлист"}
              >
                <Heart className={`h-3 w-3 ${wishlistItems.has(g.name) ? "fill-current" : ""}`} />
              </button>
            </div>
          ))}
        </div>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Подпись (необязательно)"
          maxLength={200}
          className="mb-4 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!selected || sending}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? "Отправка..." : selected ? `Отправить ${selected.emoji}` : "Выберите подарок"}
        </button>
      </div>
    </div>
  );
}
