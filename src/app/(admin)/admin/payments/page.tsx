"use client";

import * as React from "react";
import { CreditCard, TrendingUp, Filter, RotateCcw } from "lucide-react";
import { toast } from "@/store/toast-store";

interface Payment {
  id: string;
  user: { id: string; username: string; displayName: string };
  plan: { name: string; slug: string };
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  completedPayments: number;
  failedPayments: number;
}

const STATUS_TABS = [
  { key: "", label: "Все" },
  { key: "COMPLETED", label: "Завершены" },
  { key: "PENDING", label: "Ожидают" },
  { key: "FAILED", label: "Ошибки" },
  { key: "REFUNDED", label: "Возвраты" },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-500",
  PENDING: "bg-yellow-500/10 text-yellow-500",
  FAILED: "bg-red-500/10 text-red-500",
  REFUNDED: "bg-purple-500/10 text-purple-500",
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Завершён",
  PENDING: "Ожидает",
  FAILED: "Ошибка",
  REFUNDED: "Возврат",
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [stats, setStats] = React.useState<PaymentStats | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const limit = 20;

  const loadPayments = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/payments?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.data?.payments ?? data.payments ?? []);
        setTotal(data.data?.total ?? data.total ?? 0);
        setStats(data.data?.stats ?? data.stats ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  React.useEffect(() => { loadPayments(); }, [loadPayments]);

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleRefund = async (paymentId: string) => {
    if (!confirm("Вернуть средства?")) return;
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentId, action: "refund" }),
      });
      if (res.ok) {
        toast.success("Возврат выполнен");
        loadPayments();
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Ошибка возврата");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">История платежей</h1>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Общая выручка</span>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalRevenue.toLocaleString("ru-RU")} ₽</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Всего платежей</span>
              <CreditCard className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalPayments.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Завершены</span>
              <CreditCard className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.completedPayments.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ошибки</span>
              <CreditCard className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.failedPayments.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleStatusChange(tab.key)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
              statusFilter === tab.key
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="p-3">Пользователь</th>
              <th className="p-3">План</th>
              <th className="p-3">Сумма</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Провайдер</th>
              <th className="p-3">Дата</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Загрузка...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Нет платежей</td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30">
                <td className="p-3">
                  <div>
                    <span className="font-medium">{p.user.displayName}</span>
                    <span className="ml-2 text-muted-foreground">@{p.user.username}</span>
                  </div>
                </td>
                <td className="p-3">{p.plan.name}</td>
                <td className="p-3 font-medium">{p.amount.toLocaleString("ru-RU")} {p.currency}</td>
                <td className="p-3">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${STATUS_COLORS[p.status] ?? "bg-muted text-muted-foreground"}`}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{p.provider}</td>
                <td className="p-3 text-muted-foreground whitespace-nowrap">
                  {new Date(p.createdAt).toLocaleString("ru")}
                </td>
                <td className="p-3">
                  {p.status === "COMPLETED" && (
                    <button
                      type="button"
                      onClick={() => handleRefund(p.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Возврат
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            Назад
          </button>
          <span className="py-1 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}
