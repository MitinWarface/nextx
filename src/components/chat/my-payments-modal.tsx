"use client";

import * as React from "react";
import { X, CreditCard, Check, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  status: string;
  provider: string;
  planName?: string;
  createdAt: string;
}

interface MyPaymentsModalProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  COMPLETED: { label: "Оплачен", color: "text-emerald-500", icon: Check },
  PENDING: { label: "Ожидает", color: "text-yellow-500", icon: Clock },
  FAILED: { label: "Ошибка", color: "text-red-500", icon: AlertTriangle },
  REFUNDED: { label: "Возврат", color: "text-blue-500", icon: AlertTriangle },
};

export function MyPaymentsModal({ open, onClose }: MyPaymentsModalProps) {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/premium?tab=payments", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPayments(d.payments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[70vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">История платежей</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет платежей</div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => {
                const s = STATUS_MAP[p.status] ?? STATUS_MAP.FAILED;
                const Icon = s.icon;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{p.planName ?? "Подписка"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("ru")} · {p.provider}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{(p.amount / 100).toLocaleString("ru")} ₽</p>
                      <p className={cn("flex items-center gap-1 text-xs", s.color)}>
                        <Icon className="h-3 w-3" />
                        {s.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
