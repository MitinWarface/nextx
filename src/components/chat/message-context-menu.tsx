"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CornerUpLeft, Copy, Check, Pencil, Trash2, Forward, Pin, PinOff, BookmarkPlus, CheckSquare, Flag, History, Bell, Clock, FolderPlus, Link, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface MessageContextMenuProps {
  open: boolean;
  position: ContextMenuPosition | null;
  onClose: () => void;
  onReply: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onForward?: () => void;
  onSave?: () => void;
  onSaveToCollection?: () => void;
  onTogglePin?: () => void;
  onShowEditHistory?: () => void;
  onRemind?: () => void;
  isPinned?: boolean;
  isEdited?: boolean;
  onSelect?: () => void;
  onReport?: () => void;
  onCopyLink?: () => void;
  onShowInfo?: (e: React.MouseEvent) => void;
  isOutgoing?: boolean;
  isProtected?: boolean;
}

export function MessageContextMenu({
  open,
  position,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onForward,
  onSave,
  onSaveToCollection,
  onTogglePin,
  onShowEditHistory,
  onRemind,
  isPinned = false,
  isEdited = false,
  onSelect,
  onReport,
  onCopyLink,
  onShowInfo,
  isOutgoing = false,
  isProtected = false,
}: MessageContextMenuProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = React.useState<ContextMenuPosition | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Close on outside click / scroll / escape
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, onClose]);

  // Adjust position to stay within viewport
  React.useLayoutEffect(() => {
    if (!open || !position) {
      setAdjusted(null);
      return;
    }
    const menu = ref.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = position.x;
    let y = position.y;
    if (x + rect.width > vw - 8) x = Math.max(8, vw - rect.width - 8);
    if (y + rect.height > vh - 8) y = Math.max(8, vh - rect.height - 8);
    setAdjusted({ x, y });
  }, [open, position]);

  if (!open || !position) return null;

  const handleCopy = async () => {
    if (!onCopy) return;
    setCopied(true);
    await onCopy();
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 600);
  };

  const handleAction = (fn: () => void) => {
    onClose();
    fn();
  };

  const portalNode =
    typeof document !== "undefined" ? document.body : null;
  if (!portalNode) return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{
        position: "fixed",
        top: adjusted?.y ?? position.y,
        left: adjusted?.x ?? position.x,
        visibility: adjusted ? "visible" : "hidden",
      }}
      className="z-50 min-w-[180px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
    >
      <button
        type="button"
        onClick={() => handleAction(onReply)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
      >
        <CornerUpLeft className="h-4 w-4" />
        <span>Ответить</span>
      </button>

      {onCopy && !isProtected && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent",
              copied && "text-primary",
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copied ? "Скопировано" : "Скопировать текст"}</span>
          </button>
        </>
      )}

      {onForward && !isProtected && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => handleAction(onForward)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Forward className="h-4 w-4" />
            <span>Переслать</span>
          </button>
        </>
      )}

      {onCopyLink && (
        <button
          type="button"
          onClick={() => handleAction(onCopyLink)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          <Link className="h-4 w-4" />
          <span>Скопировать ссылку</span>
        </button>
      )}

      {onSelect && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => handleAction(onSelect)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <CheckSquare className="h-4 w-4" />
            <span>Выбрать</span>
          </button>
        </>
      )}

      {onSave && (
        <button
          type="button"
          onClick={() => handleAction(onSave)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          <BookmarkPlus className="h-4 w-4" />
          <span>Сохранить в Избранное</span>
        </button>
      )}

      {onSaveToCollection && (
        <button
          type="button"
          onClick={() => handleAction(onSaveToCollection)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          <FolderPlus className="h-4 w-4" />
          <span>Сохранить в коллекцию</span>
        </button>
      )}

      {onTogglePin && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => handleAction(onTogglePin)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            {isPinned ? (
              <>
                <PinOff className="h-4 w-4" />
                <span>Открепить</span>
              </>
            ) : (
              <>
                <Pin className="h-4 w-4" />
                <span>Закрепить</span>
              </>
            )}
          </button>
        </>
      )}

      {onShowEditHistory && isEdited && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => handleAction(onShowEditHistory)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <History className="h-4 w-4" />
            <span>История изменений</span>
          </button>
        </>
      )}

      {onRemind && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => handleAction(onRemind)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Bell className="h-4 w-4" />
            <span>Напомнить</span>
          </button>
        </>
      )}

      {onEdit && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => handleAction(onEdit)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
            <span>Редактировать</span>
          </button>
        </>
      )}

      {onDelete && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => handleAction(onDelete)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span>Удалить</span>
          </button>
        </>
      )}

      {onShowInfo && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={(e) => { onClose(); onShowInfo(e); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Info className="h-4 w-4" />
            <span>Информация</span>
          </button>
        </>
      )}

      {onReport && !isOutgoing && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => handleAction(onReport)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-destructive hover:bg-destructive/10"
          >
            <Flag className="h-4 w-4" />
            <span>Пожаловаться</span>
          </button>
        </>
      )}
    </div>,
    portalNode,
  );
}
