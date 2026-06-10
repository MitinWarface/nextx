"use client";

import * as React from "react";
import { X, Bell, Lock, Palette, Key, Shield, MessageSquare, Volume2, VolumeX, Pin, Trash2, LogOut, Ban, Bot, Bug, Download, UserPlus, Smartphone, Monitor, RefreshCw, AlertTriangle, ChevronDown, ChevronRight, Copy, Users, Link as LinkIcon, Brain, EyeOff, FileText, ImagePlus, AtSign, QrCode, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { ThemeCreator } from "./theme-creator";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";
import { BotCreatorModal, BotList } from "./bot-manager";
import { VirtualNumberSection } from "@/components/settings/virtual-number";
import { MultiAccountSection } from "@/components/settings/multi-account";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { MultiProfileSection } from "@/components/settings/multi-profile";
import { DownloadManager } from "@/components/downloads/download-manager";
import { RecentFilesModal } from "@/components/files/recent-files-modal";
import { QrScannerModal } from "@/components/auth/qr-scanner-modal";

interface ChatActions {
  isMuted?: boolean;
  isPinned?: boolean;
  isGroup?: boolean;
  isService?: boolean;
  isSelf?: boolean;
  chatName?: string;
  chatPinHash?: string | null;
  onToggleMute?: () => void;
  onTogglePin?: () => void;
  onClearHistory?: () => void;
  onLeaveChat?: () => void;
  onBlockUser?: () => void;
  onTogglePinLock?: () => void;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  chatActions?: ChatActions;
  onOpenSupport?: () => void;
}

export function SettingsModal({ open, onClose, chatActions, onOpenSupport }: SettingsModalProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [tab, setTab] = React.useState<"general" | "chat" | "notifications" | "privacy" | "security" | "data" | "about" | "ai">("general");
  const [privacy, setPrivacy] = React.useState<any>(null);
  const [botsOpen, setBotsOpen] = React.useState(false);
  const [botCreatorOpen, setBotCreatorOpen] = React.useState(false);
  const [downloadsOpen, setDownloadsOpen] = React.useState(false);
  const [recentFilesOpen, setRecentFilesOpen] = React.useState(false);
  const [language, setLanguage] = React.useState(() => {
    try { return localStorage.getItem("nextx-language") || "ru"; } catch { return "ru"; }
  });

  const showChatTab = chatActions && !chatActions.isService && !chatActions.isSelf;

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/users/me/privacy", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPrivacy(d.data?.privacy ?? d.privacy ?? null))
      .catch(() => {});
  }, [open]);

  const updatePrivacy = async (field: string, value: any) => {
    try {
      const res = await fetch("/api/users/me/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setPrivacy((prev: any) => ({ ...prev, [field]: value }));
        toast.success("Настройка сохранена");
      }
    } catch { toast.error("Ошибка"); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-xl font-bold">Настройки</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-accent"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex border-b border-border px-2">
          <TabBtn key="general" id="general" label="Основные" icon={<Palette className="h-3.5 w-3.5" />} active={tab === "general"} onClick={() => setTab("general")} />
          {showChatTab && (
            <TabBtn key="chat" id="chat" label={chatActions.chatName ?? "Чат"} icon={<MessageSquare className="h-3.5 w-3.5" />} active={tab === "chat"} onClick={() => setTab("chat")} />
          )}
          <TabBtn key="notifications" id="notifications" label="Уведомления" icon={<Bell className="h-3.5 w-3.5" />} active={tab === "notifications"} onClick={() => setTab("notifications")} />
          <TabBtn key="privacy" id="privacy" label="Приватность" icon={<Lock className="h-3.5 w-3.5" />} active={tab === "privacy"} onClick={() => setTab("privacy")} />
          <TabBtn key="security" id="security" label="Безопасность" icon={<Shield className="h-3.5 w-3.5" />} active={tab === "security"} onClick={() => setTab("security")} />
          <TabBtn key="data" id="data" label="Данные" icon={<Download className="h-3.5 w-3.5" />} active={tab === "data"} onClick={() => setTab("data")} />
          <TabBtn key="about" id="about" label="О нас" icon={<Monitor className="h-3.5 w-3.5" />} active={tab === "about"} onClick={() => setTab("about")} />
          <TabBtn key="ai" id="ai" label="AI" icon={<Brain className="h-3.5 w-3.5" />} active={tab === "ai"} onClick={() => setTab("ai")} />
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === "general" && (
            <div className="space-y-4">
              <ProfileEditSection />

              <ProfileBannerSection />
              <AccentColorPicker />

              <UsernameHistorySection />

              <BioEditSection />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Тема</h3>
                <div className="flex gap-2">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTheme(t)} className={cn("rounded-md border px-4 py-2 text-sm", resolvedTheme === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}>
                      {t === "light" ? "Светлая" : t === "dark" ? "Тёмная" : "Система"}
                    </button>
                  ))}
                </div>
              </div>

              <ThemeCreator />

              <ChatFoldersSection />

              <ReferralProgram />

              <VirtualNumberSection />

              <MultiAccountSection />

              <MultiProfileSection />

              <div className="border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-semibold">Ещё</h3>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenSupport?.(); }}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-accent/60"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Bug className="h-4 w-4" /></span>
                    Сообщить о проблеме
                  </button>
                  <button
                    type="button"
                    onClick={() => setBotsOpen(true)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-accent/60"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Bot className="h-4 w-4" /></span>
                    Мои боты
                  </button>
                  <button
                    type="button"
                    onClick={() => { toast.info("PWA: добавьте приложение на панель из адресной строки браузера"); }}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-accent/60"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Download className="h-4 w-4" /></span>
                    Установить приложение
                  </button>
                  <button
                    type="button"
                    onClick={() => { toast.info("Чатграм — одна учётная запись на устройстве"); }}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-accent/60"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><UserPlus className="h-4 w-4" /></span>
                    Добавить аккаунт
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "chat" && chatActions && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={chatActions.onToggleMute}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
              >
                {chatActions.isMuted ? <VolumeX className="h-5 w-5 text-muted-foreground" /> : <Volume2 className="h-5 w-5 text-muted-foreground" />}
                <span className="text-sm font-medium">{chatActions.isMuted ? "Включить звук" : "Выключить звук"}</span>
              </button>
              <button
                type="button"
                onClick={chatActions.onTogglePin}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
              >
                <Pin className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{chatActions.isPinned ? "Открепить" : "Закрепить"}</span>
              </button>
              <button
                type="button"
                onClick={chatActions.onTogglePinLock}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
              >
                <Lock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{chatActions.chatPinHash ? "Снять PIN-замок" : "Установить PIN-замок"}</span>
              </button>
              <button
                type="button"
                onClick={chatActions.onClearHistory}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
              >
                <Trash2 className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">Очистить историю</span>
              </button>
              {chatActions.isGroup && (
                <button
                  type="button"
                  onClick={chatActions.onLeaveChat}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
                >
                  <LogOut className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Покинуть чат</span>
                </button>
              )}
              {!chatActions.isGroup && (
                <button
                  type="button"
                  onClick={chatActions.onBlockUser}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
                >
                  <Ban className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Заблокировать</span>
                </button>
              )}
            </div>
          )}

          {tab === "notifications" && (
            <NotificationSettingsTab />
          )}

          {tab === "notifications" && (
            <div className="mt-4">
              <NotificationSoundPicker />
            </div>
          )}

          {tab === "notifications" && (
            <div className="mt-4">
              <NotificationOverridesSection />
            </div>
          )}

          {tab === "privacy" && (
            <div className="space-y-3">
              {[
                { key: "showPhone", label: "Номер телефона", options: ["Все", "Контакты", "Никто"] },
                { key: "showLastSeen", label: "Время последнего визита", options: ["Все", "Контакты", "Никто"] },
                { key: "showAvatar", label: "Аватар", options: ["Все", "Контакты", "Никто"] },
                { key: "allowCalls", label: "Звонки", options: ["Все", "Контакты", "Никто"] },
              ].map((item) => (
                <div key={item.key} className="rounded-lg border border-border p-3">
                  <p className="mb-2 text-sm font-medium">{item.label}</p>
                  <div className="flex gap-1">
                    {item.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updatePrivacy(item.key, opt.toLowerCase())}
                        className={cn("rounded-md px-3 py-1.5 text-xs transition-colors", privacy?.[item.key] === opt.toLowerCase() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <StealthModeToggle />
              <PrivacySettings />
            </div>
          )}

          {tab === "security" && (
            <SecurityTab />
          )}

          {tab === "data" && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Язык</h3>
                <div className="flex gap-2">
                  {[
                    { code: "ru", label: "Русский" },
                    { code: "en", label: "English" },
                    { code: "de", label: "Deutsch" },
                    { code: "tr", label: "Türkçe" },
                    { code: "uz", label: "O'zbek" },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code);
                        try { localStorage.setItem("nextx-language", l.code); } catch {}
                        toast.success(`Язык: ${l.label}`);
                      }}
                      className={cn("rounded-md border px-3 py-1.5 text-sm", language === l.code ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <AutoDownloadSettings />

              <ProxySettings />

              <div className="border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-semibold">Хранилище</h3>
                <p className="text-xs text-muted-foreground mb-2">Кэшированные данные и медиафайлы занимают примерно 0 МБ.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDownloadsOpen(true)}
                    className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Загрузки
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecentFilesOpen(true)}
                    className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Недавние файлы
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Очистить кэш приложения?")) {
                      try {
                        // Only clear cache-related keys, preserve user preferences
                        const keysToPreserve = [
                          "nextx-language", "nextx-notification-settings",
                          "nextx-notification-sound", "nextx-notification-overrides",
                          "nextx-auto-download", "nextx-proxy",
                        ];
                        const preserved: Record<string, string> = {};
                        for (const key of keysToPreserve) {
                          const val = localStorage.getItem(key);
                          if (val !== null) preserved[key] = val;
                        }
                        localStorage.clear();
                        sessionStorage.clear();
                        for (const [key, val] of Object.entries(preserved)) {
                          localStorage.setItem(key, val);
                        }
                        toast.success("Кэш очищен");
                      } catch { toast.error("Ошибка"); }
                    }
                  }}
                  className="mt-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Очистить кэш
                </button>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-semibold">Экспорт данных</h3>
                <p className="text-xs text-muted-foreground mb-2">Скачайте копию ваших данных (GDPR).</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/users/me/data-export", { credentials: "include" });
                      if (!res.ok) throw new Error();
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `nextx-data-export-${new Date().toISOString().slice(0, 10)}.json`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      toast.success("Экспорт скачан");
                    } catch {
                      toast.error("Ошибка при экспорте данных");
                    }
                  }}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Скачать данные
                </button>
              </div>

              <div className="border-t border-destructive/30 pt-4">
                <DangerZone />
              </div>
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <img src="/favicon.svg" alt="NextX" className="h-16 w-16 mb-3" />
                <h2 className="text-xl font-bold">NextX Messenger</h2>
                <p className="text-sm text-muted-foreground">Версия 1.0.0</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded-lg border border-border p-3">
                  <span className="text-muted-foreground">Платформа</span>
                  <span>{typeof navigator !== "undefined" ? navigator.userAgent.split(" ").slice(-1)[0] : "Web"}</span>
                </div>
                <div className="flex justify-between rounded-lg border border-border p-3">
                  <span className="text-muted-foreground">Браузер</span>
                  <span>{typeof navigator !== "undefined" ? navigator.userAgent.split(" ").slice(-2)[0] : "—"}</span>
                </div>
                <div className="flex justify-between rounded-lg border border-border p-3">
                  <span className="text-muted-foreground">Лицензия</span>
                  <span>MIT</span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <a href="/docs" target="_blank" className="block rounded-lg border border-border p-3 text-sm hover:bg-accent/50">
                  Документация API
                </a>
              </div>
            </div>
          )}

          {tab === "ai" && <AiMemoryTab />}

          {tab === "ai" && (
            <div className="mt-4">
              <AiModerationToggle />
            </div>
          )}
        </div>
      </div>

      {/* Bots modal */}
      {botsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setBotsOpen(false)}>
          <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold">Мои боты</h2>
              <button type="button" onClick={() => setBotsOpen(false)} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
            </div>
        <div className="flex-1 overflow-auto p-6">
              <BotList />
            </div>
            <div className="border-t border-border p-3">
              <button
                type="button"
                onClick={() => { setBotsOpen(false); setBotCreatorOpen(true); }}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Создать бота
              </button>
            </div>
          </div>
        </div>
      )}
      <BotCreatorModal
        open={botCreatorOpen}
        onClose={() => setBotCreatorOpen(false)}
        onCreated={() => { setBotCreatorOpen(false); setBotsOpen(true); }}
      />
      <DownloadManager open={downloadsOpen} onClose={() => setDownloadsOpen(false)} />
      <RecentFilesModal open={recentFilesOpen} onClose={() => setRecentFilesOpen(false)} />
    </div>
  );
}

function TabBtn({ id, label, icon, active, onClick }: { id: string; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      key={id}
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors",
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SecurityTab() {
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [twoFAQr, setTwoFAQr] = React.useState<string | null>(null);
  const [twoFACode, setTwoFACode] = React.useState("");
  const [twoFAEnabled, setTwoFAEnabled] = React.useState(false);
  const [twoFASetupLoading, setTwoFASetupLoading] = React.useState(false);

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) return toast.error("Заполните все поля");
    if (newPwd !== confirmPwd) return toast.error("Пароли не совпадают");
    if (newPwd.length < 6) return toast.error("Минимум 6 символов");
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Пароль изменён");
        setShowChangePassword(false);
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
      } else {
        toast.error(data.error === "wrong_password" ? "Неверный пароль" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFASetupLoading(true);
    try {
      const res = await fetch("/api/users/me/two-factor?action=setup", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.qr) {
        setTwoFAQr(data.qr);
      }
    } catch {
      toast.error("Ошибка");
    } finally {
      setTwoFASetupLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFACode || twoFACode.length !== 6) return toast.error("Введите 6-значный код");
    try {
      const res = await fetch("/api/users/me/two-factor?action=enable", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFACode }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("2FA включена");
        setTwoFAEnabled(true);
        setTwoFAQr(null);
      } else {
        toast.error("Неверный код");
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  const handleDisable2FA = async () => {
    try {
      const res = await fetch("/api/users/me/two-factor?action=disable", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("2FA отключена");
        setTwoFAEnabled(false);
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setShowChangePassword(!showChangePassword)}
        className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
      >
        <Key className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Изменить пароль</p>
          <p className="text-xs text-muted-foreground">Обновить пароль аккаунта</p>
        </div>
      </button>
      {showChangePassword && (
        <div className="ml-8 space-y-2">
          <input
            type="password"
            placeholder="Текущий пароль"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Новый пароль"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Подтвердите пароль"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={loading}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleSetup2FA}
        disabled={twoFASetupLoading}
        className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
      >
        <Shield className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Двухфакторная аутентификация</p>
          <p className="text-xs text-muted-foreground">Дополнительная защита аккаунта</p>
        </div>
      </button>
      {twoFAQr && (
        <div className="ml-8 space-y-2">
          <p className="text-xs text-muted-foreground">Отсканируйте QR-код в приложении аутентификатора:</p>
          <img src={twoFAQr} alt="2FA QR" className="mx-auto h-40 w-40" />
          <input
            type="text"
            placeholder="6-значный код"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value)}
            maxLength={6}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleEnable2FA}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Подтвердить
          </button>
        </div>
      )}
      {twoFAEnabled && (
        <div className="ml-8">
          <button
            type="button"
            onClick={handleDisable2FA}
            className="w-full rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Отключить 2FA
          </button>
        </div>
      )}

      <LoginHistory />

      <div className="border-t border-border pt-3 mt-3">
        <ActiveSessions />
      </div>

      <div className="border-t border-border pt-3 mt-3">
        <PanicModeSection />
      </div>

      <div className="border-t border-border pt-3 mt-3">
        <VaultSection />
      </div>
    </div>
  );
}

function LoginHistory() {
  const [entries, setEntries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/users/me/login-history", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-4 text-center text-sm text-muted-foreground">Загрузка...</div>;
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">История входов</h3>
      <div className="space-y-1">
        {entries.slice(0, 10).map((e: any) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">{e.device || "Устройство"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {e.ipAddress || "—"} · {[e.city, e.country].filter(Boolean).join(", ")} · {new Date(e.createdAt).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {e.success ? (
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-600">Успех</span>
            ) : (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-600">{e.reason || "Ошибка"}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveSessions() {
  const [devices, setDevices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/devices", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const revoke = async (deviceId: string) => {
    setRevoking(deviceId);
    try {
      const res = await fetch(`/api/users/me/devices/${deviceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Сеанс завершён");
        load();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setRevoking(null);
    }
  };

  const trustBadge = (level: string) => {
    if (level === "trusted") return <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-600">Подтверждено</span>;
    if (level === "suspicious") return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-600">Подозрительное</span>;
    return <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-600">Новое</span>;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Сейчас";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    return d.toLocaleDateString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const [revokingAll, setRevokingAll] = React.useState(false);

  const revokeAllOthers = async () => {
    if (!confirm("Завершить все остальные сеансы?")) return;
    setRevokingAll(true);
    try {
      const res = await fetch("/api/users/me/devices/revoke-others", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Все остальные сеансы завершены");
        load();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Активные сеансы</h3>
        <button type="button" onClick={load} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setQrScannerOpen(true)}
        className="w-full rounded-md border border-primary/30 px-3 py-2 text-sm text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
      >
        <QrCode className="h-4 w-4" />
        Сканировать QR для входа на новое устройство
      </button>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : devices.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Нет активных сеансов</div>
      ) : (
        <div className="space-y-2">
          {devices.filter(d => !d.isRevoked).map((device, idx) => (
            <div key={device.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{device.deviceName}</span>
                    {trustBadge(device.trustLevel)}
                    {idx === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Текущее</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[device.city, device.country].filter(Boolean).join(", ") || device.ipAddress || "—"}
                    {" · "}
                    {formatTime(device.lastActivity)}
                  </p>
                </div>
              </div>
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => revoke(device.id)}
                  disabled={revoking === device.id}
                  className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  {revoking === device.id ? "..." : "Завершить"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {devices.filter(d => !d.isRevoked).length > 1 && (
        <button
          type="button"
          onClick={revokeAllOthers}
          disabled={revokingAll}
          className="w-full rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {revokingAll ? "Завершение..." : "Завершить все остальные сеансы"}
        </button>
      )}

      <AutoCleanupSetting />

      <QrScannerModal
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
      />
    </div>
  );
}

function AutoCleanupSetting() {
  const [period, setPeriod] = React.useState(() => {
    try { return localStorage.getItem("nextx-session-cleanup") || "never"; } catch { return "never"; }
  });

  const options = [
    { value: "never", label: "Никогда" },
    { value: "1w", label: "1 неделя" },
    { value: "1m", label: "1 месяц" },
    { value: "3m", label: "3 месяца" },
    { value: "6m", label: "6 месяцев" },
  ];

  const handleChange = (value: string) => {
    setPeriod(value);
    try { localStorage.setItem("nextx-session-cleanup", value); } catch {}
    toast.success("Настройка сохранена");
  };

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2">
      <p className="text-sm font-medium">Автоудаление неактивных сеансов</p>
      <p className="text-xs text-muted-foreground">Устройства, не использовавшиеся дольше выбранного периода, будут автоматически завершены.</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleChange(opt.value)}
            className={cn("rounded-md border px-3 py-1.5 text-xs transition-colors", period === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DangerZone() {
  const [expanded, setExpanded] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!password) return toast.error("Введите пароль");
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, reason: reason || undefined }),
      });
      if (res.ok) {
        toast.success("Аккаунт помечен на удаление");
        setModalOpen(false);
        setPassword("");
        setReason("");
        window.location.href = "/login";
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === "wrong_password" ? "Неверный пароль" : "Ошибка удаления аккаунта");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-destructive/30">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between p-3 text-left"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Удаление аккаунта</p>
              <p className="text-xs text-muted-foreground">Необратимое действие</p>
            </div>
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
        {expanded && (
          <div className="border-t border-destructive/20 px-3 pb-3 pt-3 space-y-3">
            <p className="text-xs text-destructive/80">
              Это действие необратимо. Ваш аккаунт будет помечен на удаление и удалён через 30 дней.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить аккаунт
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={() => { setModalOpen(false); setPassword(""); setReason(""); }}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-destructive">Удаление аккаунта</h2>
              <button type="button" onClick={() => { setModalOpen(false); setPassword(""); setReason(""); }} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs text-destructive">
                  Это действие необратимо. Ваш аккаунт будет помечен на удаление и удалён через 30 дней.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Введите пароль для подтверждения</label>
                <input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Причина <span className="text-muted-foreground">(необязательно)</span></label>
                <textarea
                  placeholder="Почему вы уходите?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => { setModalOpen(false); setPassword(""); setReason(""); }}
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || !password}
                className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {loading ? "Удаление..." : "Да, удалить аккаунт"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AiModerationToggle() {
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEnabled(d.aiModerationEnabled ?? true))
      .catch(() => setEnabled(true))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiModerationEnabled: next }),
      });
      if (!res.ok) {
        setEnabled(!next);
        toast.error("Ошибка");
      }
    } catch {
      setEnabled(!next);
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-violet-500" />
          <div>
            <p className="text-sm font-medium">AI-модерация сообщений</p>
            <p className="text-xs text-muted-foreground">
              Сканировать мои сообщения через AI для обнаружения вредоносного контента
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            enabled ? "bg-violet-500" : "bg-muted-foreground/30",
          )}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
              enabled ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>
    </div>
  );
}

function StealthModeToggle() {
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEnabled(d.stealthMode ?? false))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stealthMode: next }),
      });
      if (!res.ok) {
        setEnabled(!next);
        toast.error("Ошибка");
      }
    } catch {
      setEnabled(!next);
      toast.error("Ошибка сети");
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <EyeOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Режим невидимки</p>
            <p className="text-xs text-muted-foreground">
              Не отправлять отчёты о прочтении и индикаторы набора текста
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            enabled ? "bg-primary" : "bg-muted-foreground/30",
          )}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
              enabled ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>
    </div>
  );
}

function ReferralProgram() {
  const [data, setData] = React.useState<{ referralCode: string | null; referralCount: number; referralBonus: number; referredBy: string | null; referredUsers: any[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [code, setCode] = React.useState("");
  const [applying, setApplying] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/referral", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const copyCode = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
      toast.success("Код скопирован");
    }
  };

  const applyCode = async () => {
    if (!code.trim()) return;
    setApplying(true);
    try {
      const res = await fetch("/api/users/me/referral", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", referralCode: code.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(`+${d.bonus} NC бонус!`);
        setCode("");
        load();
      } else {
        if (d.error === "referral_already_applied") toast.error("Реферальный код уже применён");
        else if (d.error === "invalid_referral_code") toast.error("Неверный код");
        else if (d.error === "cannot_refer_self") toast.error("Нельзя использовать свой код");
        else toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Реферальная программа</h3>

      {data?.referralCode && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground mb-2">Ваш реферальный код</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">{data.referralCode}</code>
            <button type="button" onClick={copyCode} className="rounded-md border border-border p-2 hover:bg-accent">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-border p-3 text-center">
          <p className="text-lg font-bold">{data?.referralCount ?? 0}</p>
          <p className="text-xs text-muted-foreground">Приглашено</p>
        </div>
        <div className="flex-1 rounded-lg border border-border p-3 text-center">
          <p className="text-lg font-bold text-primary">{data?.referralBonus ?? 0} NC</p>
          <p className="text-xs text-muted-foreground">Бонус</p>
        </div>
      </div>

      {!data?.referredBy && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground mb-2">Ввести реферальный код</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
            />
            <button
              type="button"
              onClick={applyCode}
              disabled={applying || !code.trim()}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {applying ? "..." : "Применить"}
            </button>
          </div>
        </div>
      )}

      {data?.referredUsers && data.referredUsers.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Приглашённые</p>
          <div className="space-y-1 max-h-40 overflow-auto">
            {data.referredUsers.map((r: any) => (
              <div key={r.user.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm">{r.user.displayName}</span>
                <span className="text-xs text-primary">+{r.bonusAmount} NC</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



function NotificationSettingsTab() {
  const [settings, setSettings] = React.useState(() => {
    try {
      const saved = localStorage.getItem("nextx-notification-settings");
      return saved ? JSON.parse(saved) : { pushEnabled: true, soundEnabled: true, showPreview: true };
    } catch {
      return { pushEnabled: true, soundEnabled: true, showPreview: true };
    }
  });

  const toggle = async (key: keyof typeof settings) => {
    const newValue = !settings[key];
    const newSettings = { ...settings, [key]: newValue };
    setSettings(newSettings);
    localStorage.setItem("nextx-notification-settings", JSON.stringify(newSettings));
    try {
      await fetch("/api/users/me/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
    } catch {}
  };

  return (
    <div className="space-y-3">
      {[
        { key: "pushEnabled" as const, label: "Push-уведомления", desc: "Получать push о новых сообщениях" },
        { key: "soundEnabled" as const, label: "Звук", desc: "Звуковое оповещение" },
        { key: "showPreview" as const, label: "Превью сообщения", desc: "Показывать текст в уведомлении" },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => toggle(item.key)}
            className={cn("relative h-6 w-11 rounded-full transition-colors", settings[item.key] ? "bg-primary" : "bg-muted")}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                settings[item.key] ? "right-0.5" : "left-0.5",
              )}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

function PanicModeSection() {
  const [status, setStatus] = React.useState<{ isPanicking: boolean; isPinSet: boolean } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pin, setPin] = React.useState("");
  const [acting, setActing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/panic/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleSetup = async () => {
    if (!pin || pin.length < 4) return toast.error("Минимум 4 символа");
    setActing(true);
    try {
      const res = await fetch("/api/users/me/panic", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", pin }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Panic PIN установлен");
        setPin("");
        load();
      } else {
        toast.error(data.error === "panic_pin_already_set" ? "PIN уже установлен" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setActing(false);
    }
  };

  const handleActivate = async () => {
    if (!pin) return;
    if (!confirm("Активировать Panic Mode? Все устройства будут разлогинены, Vault заблокирован.")) return;
    setActing(true);
    try {
      const res = await fetch("/api/users/me/panic", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", pin }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Panic Mode активирован");
        setPin("");
        load();
      } else {
        toast.error(data.error === "invalid_pin" ? "Неверный PIN" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setActing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!pin) return;
    setActing(true);
    try {
      const res = await fetch("/api/users/me/panic", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", pin }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Panic Mode деактивирован");
        setPin("");
        load();
      } else {
        toast.error(data.error === "invalid_pin" ? "Неверный PIN" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setActing(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h3 className="text-sm font-semibold">Panic Mode</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        При активации: все устройства будут разлогинены, скрытые чаты скрыты, Vault заблокирован.
      </p>

      {status?.isPanicking && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">⚠ Panic Mode активен</p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Panic PIN</label>
        <input
          type="password"
          placeholder="PIN (4-8 цифр)"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={8}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-2">
        {!status?.isPinSet ? (
          <button
            type="button"
            onClick={handleSetup}
            disabled={acting || pin.length < 4}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {acting ? "..." : "Установить PIN"}
          </button>
        ) : !status?.isPanicking ? (
          <button
            type="button"
            onClick={handleActivate}
            disabled={acting || !pin}
            className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {acting ? "..." : "Активировать"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={acting || !pin}
            className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {acting ? "..." : "Деактивировать"}
          </button>
        )}
      </div>
    </div>
  );
}

function VaultSection() {
  const [vaultOpen, setVaultOpen] = React.useState(false);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Vault</h3>
        </div>
        <p className="text-xs text-muted-foreground">Безопасное хранилище паролей, документов и заметок.</p>
        <button
          type="button"
          onClick={() => setVaultOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
        >
          <Lock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Открыть Vault</p>
            <p className="text-xs text-muted-foreground">Пароли, документы, seed-фразы</p>
          </div>
        </button>
      </div>
    </>
  );
}

function ProfileBannerSection() {
  const [bannerUrl, setBannerUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBannerUrl(d.bannerUrl ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Максимум 5 МБ");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("upload_failed");
      const data = await res.json();
      const url = data.url;
      await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerUrl: url }),
      });
      setBannerUrl(url);
      toast.success("Баннер обновлён");
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerUrl: null }),
      });
      setBannerUrl(null);
      toast.success("Баннер удалён");
    } catch {
      toast.error("Ошибка");
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-2 text-sm font-semibold">Баннер профиля</h3>
      <div className="relative h-24 w-full overflow-hidden rounded-lg bg-muted">
        {bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
            Нет баннера
          </div>
        )}
      </div>
      <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50">
        <ImagePlus className="h-4 w-4" />
        {uploading ? "Загрузка..." : "Загрузить баннер"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}

const ACCENT_COLORS = [
  { name: "blue", value: "#3b82f6", label: "Синий" },
  { name: "purple", value: "#a855f7", label: "Фиолетовый" },
  { name: "pink", value: "#ec4899", label: "Розовый" },
  { name: "red", value: "#ef4444", label: "Красный" },
  { name: "orange", value: "#f97316", label: "Оранжевый" },
  { name: "green", value: "#22c55e", label: "Зелёный" },
  { name: "teal", value: "#14b8a6", label: "Бирюзовый" },
  { name: "indigo", value: "#6366f1", label: "Индиго" },
];

function AccentColorPicker() {
  const [accentColor, setAccentColor] = React.useState<string | null>(null);
  const [isPremium, setIsPremium] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAccentColor(d.accentColor ?? null);
        setIsPremium(d.premiumStatus === "active");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (color: string | null) => {
    if (!isPremium) {
      toast.error("Только для Premium");
      return;
    }
    setAccentColor(color);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor: color }),
      });
      toast.success("Акцентный цвет сохранён");
    } catch {
      toast.error("Ошибка");
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold">Акцентный цвет</h3>
        {!isPremium && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">Premium</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Цвет вашего имени в чатах
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
            accentColor === null ? "border-foreground" : "border-transparent hover:border-muted-foreground/30",
          )}
          title="По умолчанию"
        >
          <span className="h-5 w-5 rounded-full bg-muted" />
        </button>
        {ACCENT_COLORS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => handleSelect(c.value)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
              accentColor === c.value ? "border-foreground" : "border-transparent hover:border-muted-foreground/30",
            )}
            title={c.label}
          >
            <span className="h-5 w-5 rounded-full" style={{ backgroundColor: c.value }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function UsernameHistorySection() {
  const [data, setData] = React.useState<{ username: string; usernameHistory: string[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setData({ username: d.username, usernameHistory: d.usernameHistory ?? [] });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleChangeUsername = async () => {
    if (!newUsername.trim() || newUsername.trim() === data?.username) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Имя пользователя изменено");
        setNewUsername("");
        setEditing(false);
        load();
      } else {
        if (d.error === "username_taken") toast.error("Имя занято");
        else if (d.error === "invalid_username_format") toast.error("Только латиница, цифры и _");
        else toast.error(d.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const historyCount = data?.usernameHistory?.length ?? 0;
  const maxUsernames = 3;
  const canAdd = historyCount < maxUsernames;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-2">
        <AtSign className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Имена пользователей</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {historyCount}/{maxUsernames}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        История ваших имён. Старые имена отображаются в профиле.
      </p>

      {/* Current username */}
      <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Текущее:</span>
          <span className="text-sm font-medium">@{data?.username}</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"
        >
          {editing ? "Отмена" : "Изменить"}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="Новое имя"
            maxLength={32}
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleChangeUsername()}
            disabled={saving || !newUsername.trim() || newUsername.trim() === data?.username}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "..." : "OK"}
          </button>
        </div>
      )}

      {/* History */}
      {data?.usernameHistory && data.usernameHistory.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Прошлые имена:</p>
          {data.usernameHistory.map((name, i) => (
            <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5">
              <span className="text-sm text-muted-foreground">@{name}</span>
            </div>
          ))}
        </div>
      )}

      {!canAdd && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Достигнут лимит в {maxUsernames} имён
        </p>
      )}
    </div>
  );
}

function ProfileEditSection() {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setUser(d);
        setDisplayName(d.displayName ?? "");
        setPhone(d.phone ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!displayName.trim()) return toast.error("Введите имя");
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), phone: phone.trim() || null }),
      });
      if (res.ok) {
        toast.success("Профиль обновлён");
        setEditing(false);
        load();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Максимум 5 МБ");
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/uploads", { method: "POST", credentials: "include", body: fd });
      if (!uploadRes.ok) throw new Error("upload_failed");
      const { url } = await uploadRes.json();
      await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      toast.success("Аватар обновлён");
      load();
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) return <div className="py-4 text-center text-sm text-muted-foreground">Загрузка...</div>;
  if (!user) return null;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-bold text-muted-foreground">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (user.displayName ?? "?")[0]?.toUpperCase()
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90">
            <ImagePlus className="h-3.5 w-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </label>
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <RefreshCw className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Имя"
                maxLength={64}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
                autoFocus
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Телефон"
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">Отмена</button>
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {saving ? "..." : "Сохранить"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-lg font-bold truncate">{user.displayName}</p>
              {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
              {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
              <button type="button" onClick={() => setEditing(true)} className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs text-primary hover:bg-primary/10">
                Редактировать
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BioEditSection() {
  const [bio, setBio] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBio(d.bio ?? ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim() || null }),
      });
      if (res.ok) {
        toast.success("О себе обновлено");
        setEditing(false);
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">О себе</h3>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">Изменить</button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Расскажите о себе..."
            rows={3}
            maxLength={140}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
          <p className="text-[10px] text-muted-foreground text-right">{bio.length}/140</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">Отмена</button>
            <button type="button" onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? "..." : "Сохранить"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{bio || "Нет описания"}</p>
      )}
    </div>
  );
}

function ChatFoldersSection() {
  const [folders, setFolders] = React.useState<Array<{ id: string; name: string; emoji: string; chatCount: number }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/chat-folders", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setFolders(d.folders ?? d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-4 text-center text-sm text-muted-foreground">Загрузка...</div>;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Папки чатов</h3>
        <button type="button" onClick={() => toast.info("Управление папками через бургер-меню")} className="text-xs text-primary hover:underline">Управление</button>
      </div>
      {folders.length === 0 ? (
        <p className="text-xs text-muted-foreground">Нет папок. Создайте через иконку фильтра в боковой панели.</p>
      ) : (
        <div className="space-y-1">
          {folders.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span>{f.emoji || "📁"}</span>
                <span className="text-sm">{f.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{f.chatCount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationSoundPicker() {
  const [current, setCurrent] = React.useState(() => {
    try { return localStorage.getItem("nextx-notification-sound") || "default"; } catch { return "default"; }
  });

  const sounds = [
    { id: "default", label: "По умолчанию" },
    { id: "none", label: "Без звука" },
    { id: "bell", label: "Колокольчик" },
    { id: "chime", label: "Мелодия" },
    { id: "ding", label: "Ding" },
  ];

  const handleChange = (id: string) => {
    setCurrent(id);
    try { localStorage.setItem("nextx-notification-sound", id); } catch {}
    toast.success("Звук уведомлений изменён");
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-2 text-sm font-semibold">Звук уведомлений</h3>
      <div className="space-y-1">
        {sounds.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleChange(s.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
              current === s.id ? "bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            <span>{s.label}</span>
            {current === s.id && <span className="h-2 w-2 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationOverridesSection() {
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("nextx-notification-overrides") || "{}"); } catch { return {}; }
  });

  const toggle = (key: string) => {
    const next = { ...overrides, [key]: !overrides[key] };
    setOverrides(next);
    try { localStorage.setItem("nextx-notification-overrides", JSON.stringify(next)); } catch {}
  };

  const items = [
    { key: "groups", label: "Группы", desc: "Уведомления из групповых чатов" },
    { key: "channels", label: "Каналы", desc: "Уведомления из каналов" },
    { key: "bots", label: "Боты", desc: "Уведомления от ботов" },
    { key: "calls", label: "Звонки", desc: "Уведомления о звонках" },
  ];

  return (
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-2 text-sm font-semibold">Дополнительно</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(item.key)}
              className={cn("relative h-6 w-11 rounded-full transition-colors", overrides[item.key] ? "bg-primary" : "bg-muted")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", overrides[item.key] ? "right-0.5" : "left-0.5")} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutoDownloadSettings() {
  const [settings, setSettings] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nextx-auto-download") || JSON.stringify({
        photos: true, videos: false, files: false, maxFileSize: 10,
      }));
    } catch { return { photos: true, videos: false, files: false, maxFileSize: 10 }; }
  });

  const toggle = (key: string) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try { localStorage.setItem("nextx-auto-download", JSON.stringify(next)); } catch {}
  };

  const setMaxSize = (size: number) => {
    const next = { ...settings, maxFileSize: size };
    setSettings(next);
    try { localStorage.setItem("nextx-auto-download", JSON.stringify(next)); } catch {}
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-2 text-sm font-semibold">Авто-загрузка</h3>
      <p className="text-xs text-muted-foreground mb-3">Автоматически загружать медиа при открытии чата</p>
      {[
        { key: "photos", label: "Фото" },
        { key: "videos", label: "Видео" },
        { key: "files", label: "Файлы" },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between py-1.5">
          <span className="text-sm">{item.label}</span>
          <button
            type="button"
            onClick={() => toggle(item.key)}
            className={cn("relative h-6 w-11 rounded-full transition-colors", settings[item.key] ? "bg-primary" : "bg-muted")}
          >
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", settings[item.key] ? "right-0.5" : "left-0.5")} />
          </button>
        </div>
      ))}
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground mb-2">Макс. размер файла для авто-загрузки</p>
        <div className="flex gap-1.5">
          {[1, 5, 10, 50, 100].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setMaxSize(size)}
              className={cn("rounded-md border px-2.5 py-1 text-xs", settings.maxFileSize === size ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}
            >
              {size} МБ
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProxySettings() {
  const [proxy, setProxy] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("nextx-proxy") || JSON.stringify({ enabled: false, host: "", port: "" })); }
    catch { return { enabled: false, host: "", port: "" }; }
  });

  const save = (next: typeof proxy) => {
    setProxy(next);
    try { localStorage.setItem("nextx-proxy", JSON.stringify(next)); } catch {}
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Прокси</h3>
        <button
          type="button"
          onClick={() => save({ ...proxy, enabled: !proxy.enabled })}
          className={cn("relative h-6 w-11 rounded-full transition-colors", proxy.enabled ? "bg-primary" : "bg-muted")}
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", proxy.enabled ? "right-0.5" : "left-0.5")} />
        </button>
      </div>
      {proxy.enabled && (
        <div className="space-y-2 mt-2">
          <input
            type="text"
            value={proxy.host}
            onChange={(e) => save({ ...proxy, host: e.target.value })}
            placeholder="Хост (например: 127.0.0.1)"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={proxy.port}
            onChange={(e) => save({ ...proxy, port: e.target.value })}
            placeholder="Порт (например: 1080)"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">SOCKS5 прокси для подключения к серверу</p>
        </div>
      )}
    </div>
  );
}

function AiMemoryTab() {
  const [memories, setMemories] = React.useState<Array<{
    id: string;
    key: string;
    value: string;
    expiresAt: string | null;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/ai-memory", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/ai-memory", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), value: newValue.trim() }),
      });
      if (res.ok) {
        toast.success("Память сохранена");
        setNewKey("");
        setNewValue("");
        load();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const res = await fetch("/api/users/me/ai-memory", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        toast.success("Удалено");
        load();
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4" /> Память AI
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Храните контекст, который AI будет учитывать в диалогах. Например: предпочтения, проекты, контакты.
        </p>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Ключ (например: my_project, language偏好)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Значение (например: Разрабатываю чат на Next.js 15, использую Prisma + PostgreSQL)"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !newKey.trim() || !newValue.trim()}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Сохранение..." : "Добавить память"}
        </button>
      </div>

      {loading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : memories.length === 0 ? (
        <div className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
          Нет сохранённых воспоминаний
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">{m.key}</p>
                  <p className="mt-0.5 text-sm text-foreground/80 whitespace-pre-wrap break-words">{m.value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString("ru")}
                    {m.expiresAt && ` · истекает ${new Date(m.expiresAt).toLocaleDateString("ru")}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(m.key)}
                  className="shrink-0 rounded p-1 text-destructive hover:bg-destructive/10"
                  title="Удалить"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
