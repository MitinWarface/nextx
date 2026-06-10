"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Plus,
  User as UserIcon,
  Users,
  Wallet,
  Settings,
  Gift,
  HelpCircle,
  ChevronRight,
  LogOut,
  Crown,
  Star,
  Bell,
  History,
  Megaphone,
  MessageSquare,
  Trash2,
  Palette,
  Cloud,
  Briefcase,
  Building2,
  Image,
  Video,
  Radio,
  Shield,
  Music,
  FolderOpen,
  Rocket,
  Target,
  Zap,
  Package,
  ShoppingCart,
  BarChart3,
  Brain,
  Flame,
  Bookmark,
  Mail,
  Globe,
  Headphones,
  CalendarDays,
  CalendarClock,
  FileText,
  Archive,
  Compass,
  Bot,
  Puzzle,
  Gamepad2,
  Clock,
} from "lucide-react";

import { QuickCreateMenu } from "./quick-create-menu";
import { InterestSearchModal } from "./interest-search-modal";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { useMessagesStore } from "@/store/messages-store";
import { toast } from "@/store/toast-store";

interface MainMenuProps {
  open: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenContacts: () => void;
  onOpenWallet: () => void;
  onOpenCreate: () => void;
  onOpenSupport: () => void;
  onSendGift: () => void;
  onOpenPremium: () => void;
  onOpenMyGifts?: () => void;
  onOpenPayments?: () => void;
  onOpenTrash?: () => void;
  onOpenShop?: () => void;
  onOpenCloud?: () => void;
  onOpenFreelance?: () => void;
  onOpenTeamExchange?: () => void;
  onOpenWorkspace?: () => void;
  onOpenAlbums?: () => void;
  onOpenPersonalChannel?: () => void;
  onOpenVault?: () => void;
  onOpenEmail?: () => void;
  onOpenRecentFiles?: () => void;
  onOpenArchive?: () => void;
  onOpenCollections?: () => void;
  onOpenScheduledQueue?: () => void;
  onOpenGaming?: () => void;
  onOpenBookmarks?: () => void;
  onNavigate?: (chatType: "SELF" | "SERVICE") => void;
  activeChatId?: string | null;
}

export function MainMenu({
  open,
  onClose,
  onEditProfile,
  onOpenSettings,
  onOpenContacts,
  onOpenWallet,
  onOpenCreate,
  onOpenSupport,
  onSendGift,
  onOpenPremium,
  onOpenMyGifts,
  onOpenPayments,
  onOpenTrash,
  onOpenShop,
  onOpenCloud,
  onOpenFreelance,
  onOpenTeamExchange,
  onOpenWorkspace,
  onOpenAlbums,
  onOpenPersonalChannel,
  onOpenVault,
  onOpenEmail,
  onOpenRecentFiles,
  onOpenArchive,
  onOpenCollections,
  onOpenScheduledQueue,
  onOpenGaming,
  onOpenBookmarks,
  onNavigate,
  activeChatId = null,
}: MainMenuProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearChats = useChatStore((s) => s.clear);
  const clearMessages = useMessagesStore((s) => s.clearAll);
  const [signingOut, setSigningOut] = React.useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const [interestSearchOpen, setInterestSearchOpen] = React.useState(false);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !user) return null;

  const handleAddAccount = () => {
    toast.info("Чатграм — одна учётная запись на устройстве");
  };

  const handleMyProfile = () => {
    onClose();
    onEditProfile();
  };

  const handleContacts = () => {
    onClose();
    onOpenContacts();
  };

  const handleWallet = () => {
    onClose();
    onOpenWallet();
  };

  const handleSettings = () => {
    onClose();
    onOpenSettings();
  };

  const handleCreate = () => {
    onClose();
    onOpenCreate();
  };

  const handleSupport = () => {
    onClose();
    onOpenSupport();
  };

  const handleSendGift = () => {
    onClose();
    onSendGift();
  };

  const onLogout = () => {
    clearChats();
    clearMessages();
    setUser(null);
    window.location.href = "/login";
  };

  const displayName = user.displayName ?? user.username ?? "User";

  return createPortal(
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[60] transition-opacity duration-200",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        aria-label="Закрыть меню"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/40"
      />
      <aside
        role="dialog"
        aria-label="Главное меню"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[85vw] max-w-[340px] flex-col bg-sidebar shadow-2xl",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Profile header */}
        <button
          type="button"
          onClick={handleMyProfile}
          className="flex items-center gap-3 px-4 pt-6 pb-4 text-left transition-colors hover:bg-accent/40"
        >
          <Avatar name={displayName} src={user.avatarUrl ?? null} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">
              {displayName}
            </div>
            {user.username && (
              <div className="truncate text-xs text-muted-foreground">
                @{user.username}
              </div>
            )}
          </div>
        </button>

        {/* Actions list */}
        <div className="flex-1 overflow-y-auto py-1">
          <MenuRow
            icon={<Plus className="h-5 w-5" />}
            label="Создать"
            onClick={() => { onClose(); setQuickCreateOpen(true); }}
          />
          <MenuRow
            icon={<Cloud className="h-5 w-5" />}
            label="Облако"
            onClick={() => { onClose(); onOpenCloud?.(); }}
          />
          <div className="mx-4 my-1 border-t border-border" />
          <MenuRow
            icon={<Briefcase className="h-5 w-5" />}
            label="Услуги"
            onClick={() => { onClose(); onOpenFreelance?.(); }}
          />
          <MenuRow
            icon={<Users className="h-5 w-5" />}
            label="Биржа команд"
            onClick={() => { onClose(); onOpenTeamExchange?.(); }}
          />
          <MenuRow
            icon={<Building2 className="h-5 w-5" />}
            label="Workspace"
            onClick={() => { onClose(); onOpenWorkspace?.(); }}
          />
          <MenuRow
            icon={<Image className="h-5 w-5" />}
            label="Альбомы"
            onClick={() => { onClose(); onOpenAlbums?.(); }}
          />
          <MenuRow
            icon={<Video className="h-5 w-5" />}
            label="Видео"
            onClick={() => { onClose(); window.open("/videos", "_blank"); }}
          />
          <MenuRow
            icon={<Globe className="h-5 w-5" />}
            label="Пространства"
            onClick={() => { onClose(); window.open("/spaces", "_blank"); }}
          />
          <MenuRow
            icon={<Music className="h-5 w-5" />}
            label="Музыка"
            onClick={() => { onClose(); window.open("/music", "_blank"); }}
          />
          <MenuRow
            icon={<Headphones className="h-5 w-5" />}
            label="Поддержка"
            onClick={() => { onClose(); window.open("/support", "_blank"); }}
          />
          <MenuRow
            icon={<CalendarDays className="h-5 w-5" />}
            label="События"
            onClick={() => { onClose(); window.open("/seasonal", "_blank"); }}
          />
          <div className="mx-4 my-1 border-t border-border" />
          <MenuRow
            icon={<UserIcon className="h-5 w-5" />}
            label="Мой профиль"
            onClick={handleMyProfile}
          />
          <MenuRow
            icon={<Users className="h-5 w-5" />}
            label="Контакты"
            onClick={handleContacts}
          />
          <MenuRow
            icon={<Users className="h-5 w-5" />}
            label="Люди по интересам"
            onClick={() => { onClose(); setInterestSearchOpen(true); }}
          />
          <div className="mx-4 my-1 border-t border-border" />
          <MenuRow
            icon={<Star className="h-5 w-5 text-amber-500" />}
            label="Избранное"
            onClick={() => {
              onClose();
              onNavigate?.("SELF");
            }}
          />
          <MenuRow
            icon={<Bell className="h-5 w-5" />}
            label="Служебные уведомления"
            onClick={() => {
              onClose();
              onNavigate?.("SERVICE");
            }}
          />
          <MenuRow
            icon={<Megaphone className="h-5 w-5" />}
            label="Мой канал"
            onClick={() => {
              onClose();
              onOpenPersonalChannel?.();
            }}
          />
          <MenuRow
            icon={<Compass className="h-5 w-5" />}
            label="Каталог"
            onClick={() => { onClose(); window.open("/catalog", "_blank"); }}
          />
          <div className="mx-4 my-1 border-t border-border" />
          <MenuRow
            icon={<Mail className="h-5 w-5" />}
            label="Почта"
            onClick={() => { onClose(); onOpenEmail?.(); }}
          />
          <MenuRow
            icon={<Wallet className="h-5 w-5" />}
            label="Кошелёк"
            onClick={handleWallet}
            rightSlot={
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                NC
              </span>
            }
          />
          <MenuRow
            icon={<Crown className="h-5 w-5 text-yellow-500" />}
            label="Подписка"
            onClick={() => { onClose(); onOpenPremium(); }}
          />
          <MenuRow
            icon={<Gift className="h-5 w-5" />}
            label="Мои подарки"
            onClick={() => { onClose(); onOpenMyGifts?.(); }}
          />
          <MenuRow
            icon={<History className="h-5 w-5" />}
            label="История платежей"
            onClick={() => { onClose(); onOpenPayments?.(); }}
          />
          <MenuRow
            icon={<Palette className="h-5 w-5" />}
            label="Магазин профиля"
            onClick={() => { onClose(); onOpenShop?.(); }}
          />
          <MenuRow
            icon={<Trash2 className="h-5 w-5" />}
            label="Корзина"
            onClick={() => { onClose(); onOpenTrash?.(); }}
          />
          <MenuRow
            icon={<CalendarClock className="h-5 w-5" />}
            label="Очередь публикаций"
            onClick={() => { onClose(); onOpenScheduledQueue?.(); }}
          />
          <MenuRow
            icon={<Shield className="h-5 w-5" />}
            label="Vault"
            onClick={() => { onClose(); onOpenVault?.(); }}
          />
          <MenuRow
            icon={<Package className="h-5 w-5" />}
            label="Мини-приложения"
            onClick={() => { onClose(); window.open("/apps", "_blank"); }}
          />
          <MenuRow
            icon={<Puzzle className="h-5 w-5" />}
            label="Конструктор ботов"
            onClick={() => { onClose(); window.open("/bots/constructor", "_blank"); }}
          />
          <MenuRow
            icon={<Bot className="h-5 w-5" />}
            label="Магазин ботов"
            onClick={() => { onClose(); window.open("/bots/market", "_blank"); }}
          />
          <MenuRow
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Маркет"
            onClick={() => { onClose(); window.open("/marketplace", "_blank"); }}
          />
          <MenuRow
            icon={<Gamepad2 className="h-5 w-5" />}
            label="Игровое сообщество"
            onClick={() => { onClose(); onOpenGaming?.(); }}
          />
          <div className="mx-4 my-1 border-t border-border" />
          <MenuRow
            icon={<BarChart3 className="h-5 w-5" />}
            label="Активность"
            onClick={() => { onClose(); window.open("/stats", "_blank"); }}
          />
          <MenuRow
            icon={<Brain className="h-5 w-5" />}
            label="Hub"
            onClick={() => { onClose(); window.open("/hub", "_blank"); }}
          />
          <MenuRow
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            label="Лента"
            onClick={() => { onClose(); window.open("/feed", "_blank"); }}
          />
          <MenuRow
            icon={<Bookmark className="h-5 w-5" />}
            label="Закладки"
            onClick={() => { onClose(); onOpenBookmarks?.(); }}
          />
          <MenuRow
            icon={<FolderOpen className="h-5 w-5" />}
            label="Коллекции"
            onClick={() => { onClose(); onOpenCollections?.(); }}
          />
          <MenuRow
            icon={<Clock className="h-5 w-5" />}
            label="Недавние файлы"
            onClick={() => { onClose(); onOpenRecentFiles?.(); }}
          />
          <MenuRow
            icon={<Archive className="h-5 w-5" />}
            label="Архив чатов"
            onClick={() => { onClose(); onOpenArchive?.(); }}
          />
          <div className="mx-4 my-1 border-t border-border" />
          <MenuRow
            icon={<Settings className="h-5 w-5" />}
            label="Настройки"
            onClick={handleSettings}
            rightSlot={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          />
          <MenuRow
            icon={<HelpCircle className="h-5 w-5" />}
            label="Помощь"
            onClick={handleSupport}
          />
        </div>

        {/* Logout */}
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={onLogout}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" />
            {signingOut ? "Выходим…" : "Выйти"}
          </button>
        </div>
      </aside>

      <QuickCreateMenu
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onNewChat={() => { onOpenContacts?.(); }}
        onNewGroup={() => { onOpenCreate(); }}
        onNewChannel={() => { toast.info("Создание канала"); }}
        onNewTask={() => { toast.info("Создание задачи"); }}
        onNewEvent={() => { toast.info("Создание события"); }}
        onNewReminder={() => { toast.info("Создание напоминания"); }}
      />

      <InterestSearchModal
        open={interestSearchOpen}
        onClose={() => setInterestSearchOpen(false)}
        onViewProfile={(userId) => {
          // Navigate to chat with user or open profile
          toast.info("Открытие профиля...");
        }}
      />
    </div>,
    document.body,
  );
}

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
}

function MenuRow({ icon, label, onClick, rightSlot }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/60"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {rightSlot}
    </button>
  );
}
