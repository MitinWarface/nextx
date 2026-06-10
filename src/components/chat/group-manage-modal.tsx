"use client";

import * as React from "react";
import {
  X,
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  Crown,
  UserMinus,
  Check,
  Camera,
  LogOut,
  Link2,
  Copy,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Member {
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    status?: string;
  };
}

interface GroupManageModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  myUserId: string;
  initial: {
    name: string;
    description: string | null;
    avatarUrl: string | null;
    members: Member[];
    defaultTtlSeconds?: number | null;
    slowModeSeconds?: number | null;
    isContentProtected?: boolean;
  };
  onChanged?: () => void;
}

export function GroupManageModal({
  open,
  onClose,
  chatId,
  myUserId,
  initial,
  onChanged,
}: GroupManageModalProps) {
  const [name, setName] = React.useState(initial.name);
  const [description, setDescription] = React.useState(initial.description ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(initial.avatarUrl);
  const [members, setMembers] = React.useState<Member[]>(initial.members);
  const [saving, setSaving] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);
  const [latestInvite, setLatestInvite] = React.useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [defaultTtlSeconds, setDefaultTtlSeconds] = React.useState<number | null>(
    initial.defaultTtlSeconds ?? null,
  );
  const [savingTtl, setSavingTtl] = React.useState(false);
  const [isContentProtected, setIsContentProtected] = React.useState(
    initial.isContentProtected ?? false,
  );
  const [savingProtection, setSavingProtection] = React.useState(false);
  const [slowModeSeconds, setSlowModeSeconds] = React.useState<number>(
    (initial as any).slowModeSeconds ?? 0,
  );
  const [savingSlowMode, setSavingSlowMode] = React.useState(false);
  const [chatUsername, setChatUsername] = React.useState<string>(
    (initial as any).username ?? "",
  );
  const [usernameInput, setUsernameInput] = React.useState<string>(
    (initial as any).username ?? "",
  );
  const [savingUsername, setSavingUsername] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState<string | null>(null);

  // Esc для закрытия
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Сброс при открытии
  React.useEffect(() => {
    if (open) {
      setName(initial.name);
      setDescription(initial.description ?? "");
      setAvatarUrl(initial.avatarUrl);
      setMembers(initial.members);
      setDefaultTtlSeconds(initial.defaultTtlSeconds ?? null);
      setIsContentProtected(initial.isContentProtected ?? false);
      setSlowModeSeconds((initial as any).slowModeSeconds ?? 0);
      setChatUsername((initial as any).username ?? "");
      setUsernameInput((initial as any).username ?? "");
      setUsernameError(null);
    }
  }, [open, initial]);

  const myMember = members.find((m) => m.userId === myUserId);
  const isOwner = myMember?.role === "OWNER";
  const isAdmin = isOwner || myMember?.role === "ADMIN";

  const reloadMembers = React.useCallback(async () => {
    const res = await fetch(`/api/chats/${chatId}/members/list`);
    if (!res.ok) return;
    const data = (await res.json()) as { members: Member[] };
    setMembers(data.members);
  }, [chatId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          avatarUrl,
          defaultTtlSeconds,
        }),
      });
      if (res.ok) onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const handleTtlChange = async (value: number | null) => {
    setDefaultTtlSeconds(value);
    setSavingTtl(true);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultTtlSeconds: value }),
      });
      onChanged?.();
    } finally {
      setSavingTtl(false);
    }
  };

  const handleToggleContentProtection = async () => {
    const newValue = !isContentProtected;
    setIsContentProtected(newValue);
    setSavingProtection(true);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isContentProtected: newValue }),
      });
      onChanged?.();
    } finally {
      setSavingProtection(false);
    }
  };

  const handleSlowModeChange = async (value: number) => {
    setSlowModeSeconds(value);
    setSavingSlowMode(true);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slowModeSeconds: value }),
      });
      onChanged?.();
    } finally {
      setSavingSlowMode(false);
    }
  };

  const handleSaveUsername = async () => {
    setUsernameError(null);
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setUsernameError("Username cannot be empty");
      return;
    }
    setSavingUsername(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsernameError(data.error ?? "Failed to save username");
        return;
      }
      setChatUsername(data.username ?? "");
      setUsernameInput(data.username ?? "");
      onChanged?.();
    } catch {
      setUsernameError("Network error");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleAvatarChange = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { url: string };
    setAvatarUrl(data.url);
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Удалить участника?")) return;
    const res = await fetch(`/api/chats/${chatId}/members/${userId}`, { method: "DELETE" });
    if (res.ok) {
      await reloadMembers();
      onChanged?.();
    }
  };

  const handlePromote = async (userId: string, role: "ADMIN" | "MEMBER") => {
    const res = await fetch(`/api/chats/${chatId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      await reloadMembers();
      onChanged?.();
    }
  };

  const handleLeave = async () => {
    if (!confirm("Покинуть группу?")) return;
    const res = await fetch(`/api/chats/${chatId}/members/${myUserId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onChanged?.();
      onClose();
    }
  };

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { invite: { code: string } };
      const link = `${window.location.origin}/invite/${data.invite.code}`;
      setLatestInvite(link);
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // ignore
      }
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!latestInvite) return;
    try {
      await navigator.clipboard.writeText(latestInvite);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex h-12 items-center justify-between border-b border-border px-4">
          <h2 className="text-[15px] font-semibold">Управление группой</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="group relative">
              <Avatar
                name={name || "Group"}
                src={avatarUrl}
                size="xl"
              />
              {isAdmin && (
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAvatarChange(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              className="mt-2 w-full rounded-md border border-border bg-muted/30 px-3 py-1.5 text-center text-lg font-semibold focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              disabled={!isAdmin}
              placeholder="Описание (опционально)"
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-muted/30 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <p className="text-[10.5px] text-muted-foreground">
              {description.length}/500
            </p>
          </div>

          {/* Invite link */}
          {isAdmin && (
            <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Link2 className="h-3.5 w-3.5" />
                Ссылка-приглашение
              </div>
              {latestInvite ? (
                <div className="flex items-center gap-1.5">
                  <input
                    readOnly
                    value={latestInvite}
                    className="min-w-0 flex-1 truncate rounded border border-border bg-background px-2 py-1 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyInvite}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Скопировано" : "Копировать"}
                  </Button>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleCreateInvite}
                disabled={creatingInvite}
              >
                {creatingInvite
                  ? "Создаём…"
                  : latestInvite
                    ? "Создать новую ссылку"
                    : "Создать ссылку-приглашение"}
              </Button>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                Любой, у кого есть ссылка, сможет вступить в группу.
              </p>
            </div>
          )}

          {/* Auto-delete timer */}
          {isAdmin && (
            <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Timer className="h-3.5 w-3.5" />
                Авто-удаление сообщений
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <TtlButton
                  active={defaultTtlSeconds === null}
                  onClick={() => handleTtlChange(null)}
                  label="Выкл"
                />
                <TtlButton
                  active={defaultTtlSeconds === 86400}
                  onClick={() => handleTtlChange(86400)}
                  label="24 ч"
                />
                <TtlButton
                  active={defaultTtlSeconds === 604800}
                  onClick={() => handleTtlChange(604800)}
                  label="7 дн"
                />
                <TtlButton
                  active={defaultTtlSeconds === 2592000}
                  onClick={() => handleTtlChange(2592000)}
                  label="30 дн"
                />
              </div>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                {savingTtl
                  ? "Сохраняем…"
                  : defaultTtlSeconds
                    ? "Новые сообщения будут удаляться автоматически."
                    : "Авто-удаление отключено."}
              </p>
            </div>
          )}

          {/* Content Protection toggle */}
          {isAdmin && (
            <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Защита контента
              </div>
              <button
                type="button"
                onClick={handleToggleContentProtection}
                disabled={savingProtection}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                  isContentProtected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-accent",
                )}
              >
                <span>
                  {isContentProtected ? "Контент защищён" : "Защитить контент"}
                </span>
                <div
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    isContentProtected ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                      isContentProtected ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </div>
              </button>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                {isContentProtected
                  ? "Пересылка и копирование сообщений запрещены."
                  : "Включите, чтобы запретить пересылку и копирование сообщений."}
              </p>
            </div>
          )}

          {/* Slow mode */}
          {isAdmin && (
            <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Timer className="h-3.5 w-3.5" />
                Медленный режим
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <TtlButton
                  active={slowModeSeconds === 0}
                  onClick={() => handleSlowModeChange(0)}
                  label="Выкл"
                />
                <TtlButton
                  active={slowModeSeconds === 10}
                  onClick={() => handleSlowModeChange(10)}
                  label="10 сек"
                />
                <TtlButton
                  active={slowModeSeconds === 30}
                  onClick={() => handleSlowModeChange(30)}
                  label="30 сек"
                />
                <TtlButton
                  active={slowModeSeconds === 60}
                  onClick={() => handleSlowModeChange(60)}
                  label="1 мин"
                />
                <TtlButton
                  active={slowModeSeconds === 300}
                  onClick={() => handleSlowModeChange(300)}
                  label="5 мин"
                />
                <TtlButton
                  active={slowModeSeconds === 900}
                  onClick={() => handleSlowModeChange(900)}
                  label="15 мин"
                />
              </div>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                {savingSlowMode
                  ? "Сохраняем…"
                  : slowModeSeconds > 0
                    ? `Участники смогут отправлять сообщение не чаще 1 раза в ${slowModeSeconds >= 60 ? `${slowModeSeconds / 60} мин` : `${slowModeSeconds} сек`}.`
                    : "Медленный режим отключён."}
              </p>
            </div>
          )}

          {/* Username */}
          {isAdmin && (
            <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Link2 className="h-3.5 w-3.5" />
                Публичный username
              </div>
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-xs text-muted-foreground">nextx.app/@</span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                    setUsernameError(null);
                  }}
                  placeholder="username"
                  className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveUsername}
                  disabled={savingUsername || usernameInput.trim() === (chatUsername ?? "")}
                >
                  {savingUsername ? "…" : "Сохранить"}
                </Button>
              </div>
              {usernameError && (
                <p className="mt-1 text-[10.5px] text-destructive">{usernameError}</p>
              )}
              {chatUsername && (
                <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                  Публичная ссылка: nextx.app/@{chatUsername}
                </p>
              )}
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                Латинские буквы, цифры и подчёркивания. 5–32 символа.
              </p>
            </div>
          )}

          {/* Members */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Участники · {members.length}
              </h3>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdd((v) => !v)}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  Добавить
                </Button>
              )}
            </div>
            {showAdd && (
              <div className="mb-2">
                <AddMemberInline
                  chatId={chatId}
                  excludeIds={members.map((m) => m.userId)}
                  onAdded={async () => {
                    await reloadMembers();
                    onChanged?.();
                    setShowAdd(false);
                  }}
                />
              </div>
            )}
            <ul className="space-y-1">
              {members.map((m) => {
                const isSelf = m.userId === myUserId;
                const canManage = isOwner && !isSelf && m.role !== "OWNER";
                return (
                  <li
                    key={m.userId}
                    className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted/40"
                  >
                    <Avatar name={m.user.displayName} src={m.user.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 truncate text-sm font-medium">
                        {m.user.displayName}
                        {m.role === "OWNER" && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                        {isSelf && (
                          <span className="text-[10.5px] text-muted-foreground">(вы)</span>
                        )}
                      </div>
                      <div className="truncate text-[10.5px] text-muted-foreground">
                        @{m.user.username}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        {m.role === "MEMBER" ? (
                          <button
                            type="button"
                            onClick={() => handlePromote(m.userId, "ADMIN")}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Сделать админом"
                            aria-label="Сделать админом"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePromote(m.userId, "MEMBER")}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Снять админа"
                            aria-label="Снять админа"
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemove(m.userId)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Удалить"
                          aria-label="Удалить"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </ScrollArea>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Button variant="destructive" onClick={handleLeave}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Покинуть группу
          </Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}

function TtlButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

function AddMemberInline({
  chatId,
  excludeIds,
  onAdded,
}: {
  chatId: string;
  excludeIds: string[];
  onAdded: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<
    Array<{ id: string; username: string; displayName: string; avatarUrl: string | null }>
  >([]);
  const [adding, setAdding] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { users: typeof results };
        setResults(data.users.filter((u) => !excludeIds.includes(u.id)));
      } catch {
        // ignore
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, excludeIds]);

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    try {
      await fetch(`/api/chats/${chatId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      onAdded();
      setQuery("");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск пользователей..."
        className="mb-1 w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
      />
      {results.length > 0 && (
        <ul className="max-h-32 space-y-0.5 overflow-y-auto">
          {results.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-2 rounded p-1 hover:bg-accent"
            >
              <Avatar name={u.displayName} src={u.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{u.displayName}</div>
                <div className="truncate text-[10px] text-muted-foreground">@{u.username}</div>
              </div>
              <button
                type="button"
                onClick={() => handleAdd(u.id)}
                disabled={adding === u.id}
                className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                aria-label="Добавить"
              >
                {adding === u.id ? "…" : <Check className="h-3 w-3" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
