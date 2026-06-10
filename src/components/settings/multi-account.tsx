"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { toast } from "@/store/toast-store";

export function MultiAccountSection() {
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [linkUsername, setLinkUsername] = React.useState("");
  const [linkLabel, setLinkLabel] = React.useState("");
  const [linking, setLinking] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/accounts", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleLink = async () => {
    if (!linkUsername.trim() || !linkLabel.trim()) return;
    setLinking(true);
    try {
      const res = await fetch("/api/users/me/accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: linkUsername.trim(), label: linkLabel.trim() }),
      });
      if (res.ok) {
        toast.success("Аккаунт привязан");
        setLinkUsername("");
        setLinkLabel("");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === "user_not_found" ? "Пользователь не найден" : data.error === "already_linked" ? "Уже привязан" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setLinking(false);
    }
  };

  const handleSwitch = async (accountId: string) => {
    try {
      const res = await fetch(`/api/users/me/accounts/${accountId}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Переключено на ${data.user.displayName}`);
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === "account_banned" ? "Аккаунт заблокирован" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleUnlink = async (accountId: string) => {
    if (!confirm("Отвязать аккаунт?")) return;
    try {
      const res = await fetch("/api/users/me/accounts", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) {
        toast.success("Аккаунт отвязан");
        load();
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  if (loading) return null;

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Аккаунты</h3>
      </div>

      {accounts.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {acc.secondary.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">{acc.secondary.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{acc.secondary.username} · {acc.label}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleSwitch(acc.id)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                >
                  Переключить
                </button>
                <button
                  type="button"
                  onClick={() => handleUnlink(acc.id)}
                  className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Username привязываемого аккаунта"
          value={linkUsername}
          onChange={(e) => setLinkUsername(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Метка (Работа, Личное, Игры)"
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleLink}
          disabled={linking || !linkUsername.trim() || !linkLabel.trim()}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {linking ? "Привязка..." : "Привязать аккаунт"}
        </button>
      </div>
    </div>
  );
}
