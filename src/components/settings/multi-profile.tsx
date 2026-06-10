"use client";

import * as React from "react";
import { X, Plus, Trash2, Edit3, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface Profile {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isDefault?: boolean;
  createdAt: string;
}

export function MultiProfileSection() {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeProfileId, setActiveProfileId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<Profile | null>(null);

  const fetchProfiles = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users/me/profiles", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles ?? []);
        if (!activeProfileId && data.profiles?.length > 0) {
          const def = data.profiles.find((p: Profile) => p.isDefault) ?? data.profiles[0];
          setActiveProfileId(def.id);
        }
      }
    } catch {
      toast.error("Ошибка загрузки профилей");
    } finally {
      setLoading(false);
    }
  }, [activeProfileId]);

  React.useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSwitch = async (profileId: string) => {
    try {
      const res = await fetch(`/api/users/me/profiles/${profileId}/switch`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setActiveProfileId(profileId);
        toast.success("Профиль переключён");
      } else {
        toast.error("Ошибка переключения");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm("Удалить профиль?")) return;
    try {
      const res = await fetch(`/api/users/me/profiles/${profileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Профиль удалён");
        fetchProfiles();
      }
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  const handleSetDefault = async (profileId: string) => {
    try {
      const res = await fetch(`/api/users/me/profiles/${profileId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        toast.success("Основной профиль обновлён");
        fetchProfiles();
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-2 text-sm font-semibold">Профили</h3>
        <p className="text-xs text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Профили</h3>
        <button
          type="button"
          onClick={() => { setEditingProfile(null); setShowCreate(true); }}
          className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
        >
          <Plus className="h-3 w-3" /> Создать
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-border p-4 text-center">
          <User className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">Нет дополнительных профилей</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                activeProfileId === profile.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{profile.name}</span>
                  {profile.isDefault && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Основной</span>
                  )}
                  {activeProfileId === profile.id && !profile.isDefault && (
                    <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-600">Активный</span>
                  )}
                </div>
                {profile.bio && (
                  <p className="text-[11px] text-muted-foreground truncate">{profile.bio}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {activeProfileId !== profile.id && (
                  <button
                    type="button"
                    onClick={() => handleSwitch(profile.id)}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                  >
                    Переключить
                  </button>
                )}
                {!profile.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(profile.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                    title="Сделать основным"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setEditingProfile(profile); setShowCreate(true); }}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(profile.id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ProfileFormModal
          profile={editingProfile}
          onClose={() => { setShowCreate(false); setEditingProfile(null); }}
          onSaved={() => { setShowCreate(false); setEditingProfile(null); fetchProfiles(); }}
        />
      )}
    </div>
  );
}

function ProfileFormModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(profile?.name ?? "");
  const [bio, setBio] = React.useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile?.avatarUrl ?? "");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Введите имя профиля");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        bio: bio || null,
        avatarUrl: avatarUrl || null,
      };
      const url = profile
        ? `/api/users/me/profiles/${profile.id}`
        : "/api/users/me/profiles";
      const method = profile ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(profile ? "Профиль обновлён" : "Профиль создан");
        onSaved();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {profile ? "Редактировать профиль" : "Новый профиль"}
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя профиля"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            autoFocus
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Описание (необязательно)"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="URL аватара (необязательно)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-accent">
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "..." : profile ? "Сохранить" : "Создать"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
