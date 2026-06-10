"use client";

import * as React from "react";
import { EyeOff, UserPlus, X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";
import { Avatar } from "@/components/ui/avatar";

interface ExceptionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface VisibilityEntry {
  id: string;
  targetId: string;
  setting: string;
  value: string;
  target: ExceptionUser;
}

type PrivacyLevel = "everyone" | "contacts" | "nobody";

export function PrivacySettings() {
  const [onlineLevel, setOnlineLevel] = React.useState<PrivacyLevel>("everyone");
  const [exceptions, setExceptions] = React.useState<ExceptionUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const [privacyRes, visRes] = await Promise.all([
        fetch("/api/users/me/privacy", { credentials: "include" }),
        fetch("/api/users/me/visibility?setting=online", { credentials: "include" }),
      ]);

      if (privacyRes.ok) {
        const pData = await privacyRes.json();
        const settings = pData.settings ?? pData.data?.settings;
        if (settings?.onlineVisibility) {
          setOnlineLevel(settings.onlineVisibility.toLowerCase() as PrivacyLevel);
        }
      }

      if (visRes.ok) {
        const vData = await visRes.json();
        const entries: VisibilityEntry[] = vData.settings ?? [];
        const exceptionUsers = entries
          .filter((e) => e.setting === "online" && e.value === "visible" && e.targetId !== "all" && e.targetId !== "contacts" && e.targetId !== "nobody")
          .map((e) => e.target);
        setExceptions(exceptionUsers);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setLevel = async (level: PrivacyLevel) => {
    const prev = onlineLevel;
    setOnlineLevel(level);
    try {
      const res = await fetch("/api/users/me/privacy", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: level.toUpperCase() }),
      });
      if (!res.ok) {
        setOnlineLevel(prev);
        toast.error("Ошибка");
      }
    } catch {
      setOnlineLevel(prev);
      toast.error("Ошибка сети");
    }
  };

  const addException = async (user: ExceptionUser) => {
    if (exceptions.some((e) => e.id === user.id)) return;
    try {
      const res = await fetch("/api/users/me/visibility", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: user.id, setting: "online", value: "visible" }),
      });
      if (res.ok) {
        setExceptions((prev) => [...prev, user]);
        toast.success(`${user.displayName} добавлен в исключения`);
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const removeException = async (userId: string) => {
    const prev = exceptions;
    setExceptions((prev) => prev.filter((e) => e.id !== userId));
    try {
      const res = await fetch(`/api/users/me/visibility/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setExceptions(prev);
        toast.error("Ошибка");
      }
    } catch {
      setExceptions(prev);
      toast.error("Ошибка сети");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center gap-3 mb-3">
          <EyeOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Кто видит мой онлайн-статус</p>
            <p className="text-xs text-muted-foreground">
              Управление видимостью статуса &quot;в сети&quot;
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {([
            { value: "everyone" as const, label: "Все" },
            { value: "contacts" as const, label: "Контакты" },
            { value: "nobody" as const, label: "Никто" },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLevel(opt.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs transition-colors",
                onlineLevel === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {onlineLevel !== "everyone" && (
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Исключения</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Добавить
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Эти люди будут видеть ваш статус &quot;в сети&quot; даже когда он скрыт
          </p>
          {exceptions.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-2">Нет исключений</p>
          ) : (
            <div className="space-y-1">
              {exceptions.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.displayName} src={u.avatarUrl} size="sm" />
                    <div>
                      <p className="text-xs font-medium">{u.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeException(u.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {addOpen && (
        <AddExceptionModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdd={addException}
          existingIds={exceptions.map((e) => e.id)}
        />
      )}
    </div>
  );
}

function AddExceptionModal({
  open,
  onClose,
  onAdd,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (user: ExceptionUser) => void;
  existingIds: string[];
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ExceptionUser[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(query.trim())}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setResults((data.users ?? []).filter((u: ExceptionUser) => !existingIds.includes(u.id)));
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, existingIds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Добавить исключение</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск пользователя..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-auto space-y-1">
            {searching && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searching && results.length === 0 && query.trim() && (
              <p className="py-4 text-center text-xs text-muted-foreground">Ничего не найдено</p>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onAdd(u);
                  onClose();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-accent/60"
              >
                <Avatar name={u.displayName} src={u.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.displayName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
