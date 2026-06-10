"use client";

import * as React from "react";
import { X, Send, Heart } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/store/toast-store";

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string | null;
  onSent?: () => void;
}

const PRESET_AMOUNTS = [10, 50, 100, 500, 1000, 5000];

export function DonateModal({ open, onClose, recipientId, recipientName, recipientAvatar, onSent }: DonateModalProps) {
  const [amount, setAmount] = React.useState<string>("");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setAmount("");
      setMessage("");
    }
  }, [open]);

  const handleSend = async () => {
    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) {
      toast.error("Введите сумму");
      return;
    }
    if (numAmount > 10_000_000) {
      toast.error("Максимальная сумма: 10 000 000 NC");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: recipientId, amount: numAmount }),
      });
      if (res.ok) {
        toast.success(`Перевод ${numAmount} NC отправлен!`);
        onSent?.();
        onClose();
      } else {
        const err = await res.json();
        if (err.error === "insufficient_balance") {
          toast.error("Недостаточно NC на балансе");
        } else if (err.error === "cannot_transfer_to_self") {
          toast.error("Нельзя перевести самому себе");
        } else {
          toast.error(err.error ?? "Ошибка перевода");
        }
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Поддержать автора</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Avatar name={recipientName} src={recipientAvatar ?? null} size="md" />
          <span className="text-sm font-medium">{recipientName}</span>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Сумма (NC)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 pr-12 text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">NC</span>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                amount === String(a)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {a}
            </button>
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
          disabled={!amount || parseInt(amount, 10) <= 0 || sending}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Heart className="h-4 w-4" />
          {sending ? "Отправка..." : amount ? `Поддержать на ${amount} NC` : "Введите сумму"}
        </button>
      </div>
    </div>
  );
}
