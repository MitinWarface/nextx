"use client";

import * as React from "react";
import { X, BellOff, Bell, Search, Phone, Video, Ban, ShieldOff, Users, Image as ImageIcon, Bookmark, BadgeCheck, Heart, List, HardDrive, Film, Music, FileText, Trash2, StickyNote, Globe, Crown, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatLastSeen } from "@/lib/utils";
import { GroupManageModal } from "./group-manage-modal";
import { GiftShowcase } from "./gift-showcase";
import { MuteByTime } from "./mute-by-time";
import { DonateModal } from "./donate-modal";
import { WishlistModal } from "./wishlist-modal";
import { toast } from "@/store/toast-store";

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

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
  chat: {
    name: string;
    avatarUrl?: string | null;
    animatedAvatarUrl?: string | null;
    bannerUrl?: string | null;
    type: "PRIVATE" | "GROUP" | "CHANNEL" | "SERVICE" | "SELF";
    username?: string;
    bio?: string;
    isOnline?: boolean;
    lastSeenAt?: number;
    memberCount?: number;
    isMuted?: boolean;
    otherUserId?: string;
    chatId?: string;
    description?: string | null;
    defaultTtlSeconds?: number | null;
    isContentProtected?: boolean;
    stealthMode?: boolean;
    usernameHistory?: string[];
    accentColor?: string | null;
    website?: string | null;
    socialLinks?: { twitter?: string; instagram?: string; github?: string; telegram?: string } | null;
    premiumStatus?: string;
  } | null;
  currentUserId?: string;
  onChanged?: () => void;
  className?: string;
}

export function ProfilePanel({
  open,
  onClose,
  chat,
  currentUserId,
  onChanged,
  className,
}: ProfilePanelProps) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [blockLoading, setBlockLoading] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [description, setDescription] = React.useState<string | null>(null);
  const [defaultTtlSeconds, setDefaultTtlSeconds] = React.useState<number | null>(null);
  const [slowModeSeconds, setSlowModeSeconds] = React.useState<number | null>(null);
  const [highlights, setHighlights] = React.useState<Array<{ name: string; coverUrl: string | null; stories: unknown[] }>>([]);
  const [achievements, setAchievements] = React.useState<Array<{
    code: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    unlockedAt: string;
  }>>([]);
  const [skills, setSkills] = React.useState<string[]>([]);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [skillVerifications, setSkillVerifications] = React.useState<Array<{
    skill: string;
    count: number;
    verifiers: Array<{ id: string; displayName: string; avatarUrl: string | null }>;
  }>>([]);
  const [verifyingSkill, setVerifyingSkill] = React.useState<string | null>(null);
  const [donateOpen, setDonateOpen] = React.useState(false);
  const [wishlistOpen, setWishlistOpen] = React.useState(false);
  const [storage, setStorage] = React.useState<{
    breakdown: Record<string, { count: number; totalSize: number }>;
    totalSize: number;
    totalCount: number;
  } | null>(null);
  const [storageLoading, setStorageLoading] = React.useState(false);
  const [clearingCache, setClearingCache] = React.useState(false);
  const [contactNote, setContactNote] = React.useState("");
  const [contactNoteOriginal, setContactNoteOriginal] = React.useState("");
  const [contactNoteSaving, setContactNoteSaving] = React.useState(false);

  // Загрузка участников для группы
  React.useEffect(() => {
    if (!open || !chat?.chatId || chat.type !== "GROUP") {
      setMembers([]);
      setDescription(null);
      setDefaultTtlSeconds(null);
      setSlowModeSeconds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chats/${chat.chatId}/members/list`);
        if (!res.ok) return;
        const data = (await res.json()) as { members: Member[] };
        if (!cancelled) setMembers(data.members);
        // description + ttl подтянем из /api/chats/:id
        const chatRes = await fetch(`/api/chats/${chat.chatId}`);
        if (chatRes.ok && !cancelled) {
          const c = (await chatRes.json()) as {
            description?: string | null;
            defaultTtlSeconds?: number | null;
            slowModeSeconds?: number | null;
          };
          setDescription(c.description ?? null);
          setDefaultTtlSeconds(c.defaultTtlSeconds ?? null);
          setSlowModeSeconds(c.slowModeSeconds ?? null);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, chat?.chatId, chat?.type]);

  // Проверяем статус блокировки при открытии профиля
  React.useEffect(() => {
    if (!open || !chat?.otherUserId) {
      setIsBlocked(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${chat.otherUserId}/block`);
        if (!res.ok) return;
        const data = (await res.json()) as { isBlocked: boolean };
        if (!cancelled) setIsBlocked(data.isBlocked);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, chat?.otherUserId]);

  // Загрузка highlights для приватного профиля
  React.useEffect(() => {
    if (!open || !chat?.otherUserId || chat.type !== "PRIVATE") {
      setHighlights([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stories/highlights?authorId=${chat.otherUserId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { highlights: typeof highlights };
        if (!cancelled) setHighlights(data.highlights);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [open, chat?.otherUserId, chat?.type]);

  // Load achievements for the other user (private chat)
  React.useEffect(() => {
    if (!open || !chat?.otherUserId || chat.type !== "PRIVATE") {
      setAchievements([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${chat.otherUserId}/achievements`);
        if (!res.ok) return;
        const data = (await res.json()) as { achievements: typeof achievements };
        if (!cancelled) setAchievements(data.achievements);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [open, chat?.otherUserId, chat?.type]);

  // Load skills and verifications for the other user
  React.useEffect(() => {
    if (!open || !chat?.otherUserId || chat.type !== "PRIVATE") {
      setSkills([]);
      setSkillVerifications([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${chat.otherUserId}/public`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setSkills(data.user?.skills ?? []);
          setInterests(data.user?.interests ?? []);
          setSkillVerifications(data.skillVerifications ?? []);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [open, chat?.otherUserId, chat?.type]);

  // Загрузка данных о хранилище чата
  React.useEffect(() => {
    if (!open || !chat?.chatId) {
      setStorage(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setStorageLoading(true);
      try {
        const res = await fetch(`/api/chats/${chat.chatId}/storage`, {
          credentials: "include",
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStorage(data);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setStorageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, chat?.chatId]);

  // Загрузка заметки о контакте
  React.useEffect(() => {
    if (!open || !chat?.otherUserId || chat.type !== "PRIVATE") {
      setContactNote("");
      setContactNoteOriginal("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/me/notes/${chat.otherUserId}`, {
          credentials: "include",
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setContactNote(data.note ?? "");
          setContactNoteOriginal(data.note ?? "");
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [open, chat?.otherUserId, chat?.type]);

  const handleSaveNote = React.useCallback(async () => {
    if (!chat?.otherUserId || contactNoteSaving) return;
    setContactNoteSaving(true);
    try {
      const res = await fetch(`/api/users/me/notes/${chat.otherUserId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: contactNote }),
      });
      if (res.ok) {
        setContactNoteOriginal(contactNote);
        toast.success("Заметка сохранена");
      } else {
        toast.error("Ошибка сохранения заметки");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setContactNoteSaving(false);
    }
  }, [chat?.otherUserId, contactNote, contactNoteSaving]);

  const handleClearCache = React.useCallback(async () => {
    if (!chat?.chatId || clearingCache) return;
    setClearingCache(true);
    try {
      const res = await fetch(`/api/chats/${chat.chatId}/storage`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Очищено ${data.cleared} файлов`);
        setStorage(null);
        // Reload
        const reload = await fetch(`/api/chats/${chat.chatId}/storage`, {
          credentials: "include",
        });
        if (reload.ok) setStorage(await reload.json());
      } else {
        toast.error("Не удалось очистить кэш");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setClearingCache(false);
    }
  }, [chat?.chatId, clearingCache]);

  const handleVerifySkill = React.useCallback(async (skill: string) => {
    if (!chat?.otherUserId || verifyingSkill) return;
    setVerifyingSkill(skill);
    try {
      const res = await fetch(`/api/users/${chat.otherUserId}/skills/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill }),
      });
      if (res.ok) {
        toast.success("Навык подтверждён");
        const vRes = await fetch(`/api/users/${chat.otherUserId}/public`);
        if (vRes.ok) {
          const d = await vRes.json();
          setSkillVerifications(d.skillVerifications ?? []);
        }
      } else {
        const data = await res.json();
        toast.error(data.error === "cannot_verify_own_skill" ? "Нельзя подтвердить свой навык" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setVerifyingSkill(null);
    }
  }, [chat?.otherUserId, verifyingSkill]);

  const handleToggleBlock = React.useCallback(async () => {
    if (!chat?.otherUserId) return;
    setBlockLoading(true);
    try {
      const res = await fetch(`/api/users/${chat.otherUserId}/block`, {
        method: isBlocked ? "DELETE" : "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as { isBlocked: boolean };
        setIsBlocked(data.isBlocked);
      }
    } finally {
      setBlockLoading(false);
    }
  }, [chat?.otherUserId, isBlocked]);
  // Esc для закрытия
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Профиль"
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[360px] flex-col border-l border-border bg-background shadow-xl",
          "transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
          className,
        )}
      >
        <header className="flex h-14 items-center justify-between border-b border-border px-3">
          <h2 className="text-[15px] font-semibold">
            {chat?.type === "GROUP"
              ? "Информация о группе"
              : chat?.type === "CHANNEL"
                ? "Информация о канале"
                : "Профиль"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {!chat ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Нет данных
          </div>
        ) : (
          <ScrollArea className="flex-1">
            {/* Banner */}
            {chat.bannerUrl && (
              <div className="relative h-32 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={chat.bannerUrl}
                  alt="Banner"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              </div>
            )}
            <div className="flex flex-col items-center gap-2 px-4 py-8">
              <Avatar
                name={chat.name}
                src={chat.animatedAvatarUrl || chat.avatarUrl}
                size="xl"
                online={chat.type === "PRIVATE" && chat.isOnline}
              />
              <div className="mt-3 flex items-center gap-1.5">
                <h3
                  className="text-[18px] font-semibold"
                  style={chat.accentColor ? { color: chat.accentColor } : undefined}
                >
                  {chat.name}
                </h3>
                {chat.premiumStatus === "active" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <Crown className="h-3 w-3" />
                    Premium
                  </span>
                )}
              </div>
              {chat.type === "PRIVATE" ? (
                <p className="text-sm text-muted-foreground">
                  {chat.isOnline
                    ? "в сети"
                    : chat.lastSeenAt
                      ? chat.stealthMode
                        ? "был(а) недавно"
                        : `был(а) ${formatLastSeen(chat.lastSeenAt)}`
                      : "не в сети"}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {chat.memberCount ?? 0} участников
                </p>
              )}
            </div>

            {/* Donate button — only when viewing another user's profile */}
            {chat.type === "PRIVATE" && chat.otherUserId && chat.otherUserId !== currentUserId && (
              <div className="w-full px-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setDonateOpen(true)}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Поддержать автора
                </Button>
              </div>
            )}

            {/* Wishlist button — only on own profile */}
            {chat.type === "SELF" && (
              <div className="w-full px-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setWishlistOpen(true)}
                >
                  <List className="mr-2 h-4 w-4" />
                  Мой вишлист
                </Button>
              </div>
            )}

            {chat.username && (
              <div className="border-y border-border px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground">
                  Username
                </div>
                <div className="mt-0.5 text-sm text-primary">@{chat.username}</div>
              </div>
            )}

            {chat.usernameHistory && chat.usernameHistory.length > 0 && (
              <div className="border-b border-border px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground">
                  Previously
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {chat.usernameHistory.map((u) => `@${u}`).join(", ")}
                </div>
              </div>
            )}

            {chat.bio && (
              <div className="border-b border-border px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground">Bio</div>
                <div className="mt-0.5 whitespace-pre-wrap text-sm">{chat.bio}</div>
              </div>
            )}

            {chat.website && (
              <div className="border-b border-border px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground">Website</div>
                <a
                  href={chat.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {chat.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {chat.socialLinks && Object.keys(chat.socialLinks).length > 0 && (
              <div className="border-b border-border px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground">Social Links</div>
                <div className="mt-1.5 flex gap-2">
                  {chat.socialLinks.twitter && (
                    <a
                      href={`https://twitter.com/${chat.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] transition-colors hover:bg-[#1DA1F2]/20"
                      title={chat.socialLinks.twitter}
                    >
                      <span className="text-sm font-bold">X</span>
                    </a>
                  )}
                  {chat.socialLinks.instagram && (
                    <a
                      href={`https://instagram.com/${chat.socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E4405F]/10 text-[#E4405F] transition-colors hover:bg-[#E4405F]/20"
                      title={chat.socialLinks.instagram}
                    >
                      <span className="text-sm font-bold">IG</span>
                    </a>
                  )}
                  {chat.socialLinks.github && (
                    <a
                      href={`https://github.com/${chat.socialLinks.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
                      title={chat.socialLinks.github}
                    >
                      <span className="text-sm font-bold">GH</span>
                    </a>
                  )}
                  {chat.socialLinks.telegram && (
                    <a
                      href={`https://t.me/${chat.socialLinks.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#26A5E4]/10 text-[#26A5E4] transition-colors hover:bg-[#26A5E4]/20"
                      title={chat.socialLinks.telegram}
                    >
                      <span className="text-sm font-bold">TG</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Contact Note — only for private chats with other users */}
            {chat.type === "PRIVATE" && chat.otherUserId && chat.otherUserId !== currentUserId && (
              <div className="border-b border-border px-4 py-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <StickyNote className="h-3.5 w-3.5" />
                  Заметка
                </div>
                <textarea
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  placeholder="Личная заметка об этом контакте..."
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {contactNote !== contactNoteOriginal && (
                  <div className="mt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSaveNote()}
                      disabled={contactNoteSaving || contactNote === contactNoteOriginal}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:brightness-110 disabled:opacity-50"
                    >
                      {contactNoteSaving ? "..." : "Сохранить"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="border-b border-border px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Bookmark className="h-3.5 w-3.5" />
                  Закреплённые сторис
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {highlights.map((h) => (
                    <button
                      key={h.name}
                      type="button"
                      className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg"
                    >
                      {h.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={h.coverUrl}
                          alt={h.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-accent text-xl">
                          <Bookmark className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-0.5">
                        <p className="truncate text-[10px] font-medium text-white">{h.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="border-b border-border px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  🏅 Достижения
                </div>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((a) => (
                    <div
                      key={a.code}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[12px]"
                      title={a.description}
                    >
                      <span className="text-base leading-none">{a.icon}</span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gift Showcase */}
            {chat?.otherUserId && (
              <GiftShowcase
                userId={chat.otherUserId}
                isOwner={chat.otherUserId === currentUserId}
              />
            )}

            {/* Skills with verification */}
            {skills.length > 0 && (
              <div className="border-b border-border px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" /> Навыки
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => {
                    const sv = skillVerifications.find((v) => v.skill === skill);
                    const count = sv?.count ?? 0;
                    const isVerified = count > 0;
                    return (
                      <div key={skill} className="group flex items-center gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                            isVerified
                              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                              : "border-border bg-card text-foreground/80",
                          )}
                          title={sv?.verifiers?.map((v) => v.displayName).join(", ") || "Нет подтверждений"}
                        >
                          {skill}
                          {isVerified && (
                            <BadgeCheck className="h-3 w-3 shrink-0" />
                          )}
                        </span>
                        {chat?.otherUserId && chat.otherUserId !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => handleVerifySkill(skill)}
                            disabled={verifyingSkill === skill}
                            className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/20 disabled:opacity-50"
                            title="Подтвердить навык"
                          >
                            {verifyingSkill === skill ? "..." : "✓"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {skillVerifications.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {skillVerifications.reduce((sum, v) => sum + v.count, 0)} подтверждений
                  </p>
                )}
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div className="border-b border-border px-4 py-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Интересы
                </div>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[12px] text-primary"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-3 gap-1 border-b border-border p-3">
              <MuteByTime
                isMuted={chat.isMuted ?? false}
                onToggle={async (muted, durationMinutes) => {
                  if (!chat.chatId) return;
                  try {
                    await fetch(`/api/chats/${chat.chatId}/mute`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ muted, durationMinutes }),
                    });
                    onChanged?.();
                  } catch {}
                }}
              />
              <ActionButton
                icon={<Search className="h-5 w-5" />}
                label="Поиск"
                onClick={() => {
                  if (chat.chatId) {
                    onClose();
                    router.push(`/?chat=${chat.chatId}&search=1`);
                  }
                }}
              />
              <ActionButton
                icon={<Phone className="h-5 w-5" />}
                label="Позвонить"
                onClick={() => {
                  toast.info("Звонки доступны из меню чата");
                }}
              />
            </div>

            <div className="space-y-2 px-4 py-3">
              {chat.chatId && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onClose();
                    router.push(`/?chat=${chat.chatId}&tab=media`);
                  }}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Медиа чата
                </Button>
              )}
              {chat.type === "GROUP" && chat.chatId && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setManageOpen(true)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Управление группой
                </Button>
              )}
              {chat.type === "PRIVATE" && chat.otherUserId && (
                <Button
                  variant={isBlocked ? "outline" : "destructive"}
                  className="w-full"
                  onClick={handleToggleBlock}
                  disabled={blockLoading}
                >
                  {isBlocked ? (
                    <>
                      <ShieldOff className="mr-2 h-4 w-4" />
                      Разблокировать
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Заблокировать
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  if (!chat.chatId) return;
                  if (chat.type === "GROUP") {
                    try {
                      await fetch(`/api/chats/${chat.chatId}/leave`, {
                        method: "POST",
                        credentials: "include",
                      });
                      onClose();
                      router.push("/");
                    } catch {}
                  } else {
                    try {
                      await fetch(`/api/chats/${chat.chatId}`, {
                        method: "DELETE",
                        credentials: "include",
                      });
                      onClose();
                      router.push("/");
                    } catch {}
                  }
                }}
              >
                {chat.type === "GROUP" ? "Покинуть группу" : "Удалить чат"}
              </Button>
            </div>
          </ScrollArea>
        )}
      </aside>

      <GroupManageModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        chatId={chat?.chatId ?? ""}
        myUserId={currentUserId ?? ""}
        initial={{
          name: chat?.name ?? "",
          description: description,
          avatarUrl: chat?.avatarUrl ?? null,
          members,
          defaultTtlSeconds,
          slowModeSeconds,
          isContentProtected: chat?.isContentProtected ?? false,
        }}
        onChanged={() => {
          onChanged?.();
        }}
      />

      <DonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        recipientId={chat?.otherUserId ?? ""}
        recipientName={chat?.name ?? ""}
        recipientAvatar={chat?.avatarUrl ?? null}
        onSent={() => onChanged?.()}
      />

      <WishlistModal
        open={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
      />
    </>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg p-2 transition-colors hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </button>
  );
}
