"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Trash2, LogOut, Pin, Ban, Volume2, VolumeX, Lock, Unlock, Archive, ArchiveRestore, Link2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMoreMenuProps {
  open: boolean;
  onClose: () => void;
  isMuted?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  isGroup?: boolean;
  isService?: boolean;
  isSelf?: boolean;
  isLocked?: boolean;
  isContentProtected?: boolean;
  isOwnerOrAdmin?: boolean;
  onToggleMute?: () => void;
  onTogglePin?: () => void;
  onTogglePinLock?: () => void;
  onToggleArchive?: () => void;
  onToggleContentProtection?: () => void;
  onClearHistory?: () => void;
  onLeaveChat?: () => void;
  onBlockUser?: () => void;
  onOpenInviteLinks?: () => void;
}

export function ChatMoreMenu({
  open,
  onClose,
  isMuted,
  isPinned,
  isArchived,
  isGroup,
  isService,
  isSelf,
  isLocked,
  isContentProtected,
  isOwnerOrAdmin,
  onToggleMute,
  onTogglePin,
  onTogglePinLock,
  onToggleArchive,
  onToggleContentProtection,
  onClearHistory,
  onLeaveChat,
  onBlockUser,
  onOpenInviteLinks,
}: ChatMoreMenuProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-chat-more-menu]")) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  // SERVICE and SELF chats: only allow clear history
  if (isService || isSelf) {
    return createPortal(
      <div data-chat-more-menu className="fixed right-4 top-14 z-[70] min-w-[200px] rounded-lg border border-border bg-background p-1 shadow-xl">
        <MenuItem
          icon={<Trash2 className="h-4 w-4" />}
          label="Очистить историю"
          onClick={() => { onClearHistory?.(); onClose(); }}
          danger
        />
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div data-chat-more-menu className="fixed right-4 top-14 z-[70] min-w-[200px] rounded-lg border border-border bg-background p-1 shadow-xl">
      <MenuItem
        icon={isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        label={isMuted ? "Включить звук" : "Выключить звук"}
        onClick={() => { onToggleMute?.(); onClose(); }}
      />
      <MenuItem
        icon={<Pin className="h-4 w-4" />}
        label={isPinned ? "Открепить" : "Закрепить"}
        onClick={() => { onTogglePin?.(); onClose(); }}
      />
      <MenuItem
        icon={isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        label={isLocked ? "Снять PIN-замок" : "Установить PIN-замок"}
        onClick={() => { onTogglePinLock?.(); onClose(); }}
      />
      <MenuItem
        icon={isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        label={isArchived ? "Разархивировать" : "Архивировать"}
        onClick={() => { onToggleArchive?.(); onClose(); }}
      />
      {isGroup && isOwnerOrAdmin && (
        <MenuItem
          icon={<Link2 className="h-4 w-4" />}
          label="Ссылки-приглашения"
          onClick={() => { onOpenInviteLinks?.(); onClose(); }}
        />
      )}
      {isGroup && isOwnerOrAdmin && (
        <MenuItem
          icon={<ShieldCheck className="h-4 w-4" />}
          label={isContentProtected ? "Защита контента: Вкл" : "Защита контента: Выкл"}
          onClick={() => { onToggleContentProtection?.(); onClose(); }}
        />
      )}
      <MenuItem
        icon={<Trash2 className="h-4 w-4" />}
        label="Очистить историю"
        onClick={() => { onClearHistory?.(); onClose(); }}
        danger
      />
      {isGroup && (
        <MenuItem
          icon={<LogOut className="h-4 w-4" />}
          label="Покинуть чат"
          onClick={() => { onLeaveChat?.(); onClose(); }}
          danger
        />
      )}
      {!isGroup && (
        <MenuItem
          icon={<Ban className="h-4 w-4" />}
          label="Заблокировать"
          onClick={() => { onBlockUser?.(); onClose(); }}
          danger
        />
      )}
    </div>,
    document.body,
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "hover:bg-accent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
