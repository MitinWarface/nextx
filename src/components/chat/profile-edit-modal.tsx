"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Camera, Loader2, Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/types";

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (updated: PublicUser) => void;
}

interface FullProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}

export function ProfileEditModal({
  open,
  onClose,
  onSaved,
}: ProfileEditModalProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const currentUser = useAuthStore((s) => s.user);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [original, setOriginal] = React.useState<FullProfile | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  // Load full profile (with bio) on open
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    void fetch("/api/users/me", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("load_failed");
        return (await r.json()) as FullProfile;
      })
      .then((data) => {
        setOriginal(data);
        setDisplayName(data.displayName);
        setUsername(data.username);
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatarUrl);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "load_failed");
        // fallback — взять то, что есть в сторе
        if (currentUser) {
          setDisplayName(currentUser.displayName);
          setUsername(currentUser.username);
          setAvatarUrl(currentUser.avatarUrl);
        }
      })
      .finally(() => setLoading(false));
  }, [open, currentUser]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setOriginal(null);
      setError(null);
      setSaved(false);
    }
  }, [open]);

  // Esc to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("upload_failed");
      const data = (await res.json()) as { url: string };
      setAvatarUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload_failed");
    } finally {
      setUploading(false);
      // Сброс value, чтобы можно было выбрать тот же файл
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!original) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const patch: Record<string, unknown> = {};
      if (displayName.trim() !== original.displayName)
        patch.displayName = displayName.trim();
      if (username.trim() !== original.username)
        patch.username = username.trim().toLowerCase();
      if ((bio.trim() || null) !== (original.bio ?? null))
        patch.bio = bio.trim() || null;
      if ((avatarUrl ?? null) !== (original.avatarUrl ?? null))
        patch.avatarUrl = avatarUrl ?? null;

      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(err?.error ?? `save_failed_${res.status}`);
      }
      const data = (await res.json()) as FullProfile;
      setOriginal(data);
      setSaved(true);
      // Обновляем auth store
      if (currentUser) {
        setUser({
          ...currentUser,
          username: data.username,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        });
      }
      onSaved?.({
        ...(currentUser as PublicUser),
        username: data.username,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      });
      // Закрываем с задержкой, чтобы пользователь увидел «Сохранено»
      setTimeout(() => onClose(), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save_failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const portalNode = typeof document !== "undefined" ? document.body : null;
  if (!portalNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
      aria-label="Редактировать профиль"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving && !uploading) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Мой профиль</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загружаем…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Avatar */}
            <div className="flex flex-col items-center border-b border-border px-4 py-5">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="group relative inline-block rounded-full ring-2 ring-transparent transition-all hover:ring-primary/40"
                  aria-label="Сменить аватар"
                >
                  <Avatar
                    name={displayName || username}
                    src={avatarUrl}
                    size="xl"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Нажмите, чтобы сменить аватар
              </p>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3 px-4 py-4">
              <Field
                label="Имя"
                value={displayName}
                onChange={setDisplayName}
                maxLength={64}
                required
              />
              <Field
                label="Имя пользователя"
                value={username}
                onChange={(v) => setUsername(v.toLowerCase())}
                maxLength={32}
                prefix="@"
                required
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  О себе
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="Кратко о себе"
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-right text-[10.5px] text-muted-foreground">
                  {bio.length}/280
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errorMessage(error)}
                </div>
              )}
              {saved && !error && (
                <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Check className="h-3.5 w-3.5" />
                  Сохранено
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saving || uploading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={saving || uploading || loading}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Сохранение…
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    portalNode,
  );
}

function Field({
  label,
  value,
  onChange,
  maxLength,
  prefix,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  prefix?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          required={required}
          className={cn(prefix && "pl-7")}
        />
      </div>
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "invalid_username":
      return "Логин: 3–32 символа, только a-z, 0-9, _";
    case "username_taken":
      return "Этот логин уже занят";
    case "invalid_display_name":
      return "Имя должно быть от 1 до 64 символов";
    case "bio_too_long":
      return "Описание слишком длинное (макс. 280 символов)";
    case "no_fields_to_update":
      return "Нет изменений для сохранения";
    case "unauthorized":
      return "Требуется вход";
    default:
      return `Не удалось сохранить (${code})`;
  }
}
