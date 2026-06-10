"use client";

import * as React from "react";
import { X, ArrowDownToLine, ArrowUpFromLine, Gift, Wallet as WalletIcon } from "lucide-react";
import { toast } from "@/store/toast-store";

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

function formatBalance(kopecks: number): string {
  const ton = kopecks / 100_000_000;
  return ton.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

export function WalletModal({ open, onClose }: WalletModalProps) {
  const [wallet, setWallet] = React.useState<WalletData | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [topupAmount, setTopupAmount] = React.useState("");
  const [topping, setTopping] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/wallet", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const data = d.data ?? d;
        setWallet(data.wallet);
        setTransactions(data.transactions ?? []);
      })
      .catch(() => {});
  }, [open]);

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 10 || amount > 100000) {
      toast.error("Сумма должна быть от 10 до 100 000 ₽");
      return;
    }
    setTopping(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: Math.round(amount) }),
      });
      if (res.ok) {
        const d = await res.json();
        const data = d.data ?? d;
        if (data.confirmationUrl) {
          window.open(data.confirmationUrl, "_blank");
        }
        setTopupAmount("");
        toast.success("Перенаправление на оплату…");
      } else {
        const err = await res.json();
        toast.error(err.error === "validation_failed" ? "Сумма от 10 до 100 000 ₽" : "Ошибка пополнения");
      }
    } catch { toast.error("Ошибка сети"); } finally { setTopping(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Кошелёк</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {/* Balance card */}
          <div className="mb-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-center">
            <WalletIcon className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="text-xs text-muted-foreground">Баланс</p>
            <p className="text-3xl font-bold">{wallet ? formatBalance(wallet.balance) : "0"}</p>
            <p className="text-sm text-muted-foreground">{wallet?.currency ?? "NextCoin"}</p>
          </div>

          {/* Top-up */}
          <div className="mb-4 flex gap-2">
            <input
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="Сумма (₽)"
              type="number"
              step="1"
              min="10"
              max="100000"
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
            <button type="button" onClick={handleTopup} disabled={topping || !topupAmount} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <ArrowDownToLine className="h-4 w-4" />
              {topping ? "..." : "Пополнить"}
            </button>
          </div>
          <p className="mb-4 text-[11px] text-muted-foreground">Минимум 10 ₽ · Максимум 100 000 ₽ · Оплата через YooKassa</p>

          {/* Transactions */}
          <h3 className="mb-2 text-sm font-semibold">История</h3>
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Нет транзакций</p>
          ) : (
            <div className="space-y-1">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/30">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${t.amount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                    {t.amount > 0 ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm">{t.description ?? t.type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString("ru")}</p>
                  </div>
                  <span className={`text-sm font-medium ${t.amount > 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {t.amount > 0 ? "+" : ""}{formatBalance(Math.abs(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
