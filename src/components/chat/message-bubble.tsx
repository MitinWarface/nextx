"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { HLSPlayer } from "./video-player";
import {
  Check,
  CheckCheck,
  FileText,
  Download,
  Music,
  SmilePlus,
  CornerUpRight,
  Forward,
  Pin,
  CornerUpLeft,
  MapPin,
  Crown,
  BellOff,
  Eye,
  Copy,
  User,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import type { MessageDTO, ReactionSummary, ReplyPreview } from "@/types";
import { Lightbox } from "./lightbox";
import { EmojiPicker } from "./emoji-picker";
import { VoicePlayer } from "./voice-player";
import { VoicePost } from "./voice-post";
import { AnimatedReactionBar } from "./animated-reactions";
import { TelegramText } from "./telegram-formatter";
import { renderTimecodes } from "./timecodes";
import { MediaAlbum } from "./media-album";
import { EditHistoryModal } from "./edit-history-modal";
import { MessageContextMenu } from "./message-context-menu";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";

// Drag-to-reply thresholds
const DRAG_START_THRESHOLD = 8; // px — до этого просто наблюдаем
const DRAG_DIRECTION_RATIO = 1.4; // dx должен быть в N раз больше |dy|
const DRAG_COMMIT_PX = 60; // px — порог коммита
const DRAG_MAX_PX = 110; // px — максимальное смещение для визуала

interface MessageBubbleProps {
  message: MessageDTO;
  isOutgoing: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showSender?: boolean;
  myUserId?: string;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: MessageDTO) => void;
  onReplyClick?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void | Promise<void>;
  onDelete?: (messageId: string) => void | Promise<void>;
  onForward?: (message: MessageDTO) => void;
  onCopyLink?: (chatId: string, messageId: string) => void;
  onSave?: (message: MessageDTO) => void;
  onSaveToCollection?: (message: MessageDTO) => void;
  onTogglePin?: (messageId: string, pin: boolean) => void | Promise<void>;
  domRef?: (el: HTMLDivElement | null) => void;
  searchQuery?: string;
  isCurrentSearchMatch?: boolean;
  mediaGroup?: { images: { url: string; fileName?: string }[]; startIndex: number } | null;
  bulkMode?: boolean;
  bulkSelected?: boolean;
  onBulkToggle?: (messageId: string) => void;
  onEnterBulkMode?: (messageId: string) => void;
  isSecretChat?: boolean;
  secretChatId?: string;
  userRole?: "OWNER" | "ADMIN" | "MEMBER";
  isPremium?: boolean;
  isChatVerified?: boolean;
  isChatContentProtected?: boolean;
  onReport?: (messageId: string, senderId: string) => void;
  onShowInfo?: (messageId: string) => void;
}

function MessageBubble({
  message,
  isOutgoing,
  isFirstInGroup,
  isLastInGroup,
  showSender,
  myUserId,
  onToggleReaction,
  onReply,
  onReplyClick,
  onEdit,
  onDelete,
  onForward,
  onCopyLink,
  onSave,
  onSaveToCollection,
  onTogglePin,
  domRef,
  searchQuery,
  isCurrentSearchMatch,
  mediaGroup,
  bulkMode = false,
  bulkSelected = false,
  onBulkToggle,
  onEnterBulkMode,
  isSecretChat = false,
  secretChatId,
  userRole,
  isPremium = true,
  isChatVerified = false,
  isChatContentProtected = false,
  onReport,
  onShowInfo,
}: MessageBubbleProps) {
  const status = message.status ?? "sent";
  const smileBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const [pickerPos, setPickerPos] = React.useState<{ x: number; y: number } | null>(null);
  const [decryptedContent, setDecryptedContent] = React.useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = React.useState(message.isUnlocked ?? false);
  const [unlocking, setUnlocking] = React.useState(false);
  const [viewOnceViewed, setViewOnceViewed] = React.useState(false);

  // Decrypt content for secret chats
  React.useEffect(() => {
    if (!isSecretChat || !secretChatId || !message.content) return;
    let cancelled = false;
    (async () => {
      try {
        const { decryptFromChat, hasSharedKey } = await import("@/lib/e2ee-store");
        if (hasSharedKey(secretChatId) && message.content) {
          const plain = await decryptFromChat(secretChatId, message.content);
          if (!cancelled) setDecryptedContent(plain);
        }
      } catch {
        // Decryption failed — show raw content
      }
    })();
    return () => { cancelled = true; };
  }, [isSecretChat, secretChatId, message.content]);

  const openPicker = React.useCallback(() => {
    const btn = smileBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPickerPos({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const [lightbox, setLightbox] = React.useState<{
    images: { url: string; fileName?: string }[];
    startIndex: number;
  } | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number } | null>(
    null,
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(message.content ?? "");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [editHistoryOpen, setEditHistoryOpen] = React.useState(false);
  const [editHistory, setEditHistory] = React.useState<Array<{
    id: string;
    oldContent: string;
    newContent: string;
    editedBy: { id: string; username: string; displayName: string };
    createdAt: string;
  }>>([]);
  const [editHistoryLoading, setEditHistoryLoading] = React.useState(false);
  const [remindOpen, setRemindOpen] = React.useState(false);
  const [messageInfo, setMessageInfo] = React.useState<{ viewCount: number; forwardCount: number; copyCount: number } | null>(null);
  const [infoPopoverPos, setInfoPopoverPos] = React.useState<{ x: number; y: number } | null>(null);

  const canEdit = (isOutgoing || userRole === "OWNER" || userRole === "ADMIN") && message.type === "TEXT";
  const canDelete = isOutgoing || userRole === "OWNER" || userRole === "ADMIN";
  const isPaidLocked = message.isPaid && !isOutgoing && !isUnlocked;
  const isProtected = message.isProtected || isChatContentProtected;

  const handleUnlock = React.useCallback(async () => {
    if (unlocking || !message.paidPrice) return;
    setUnlocking(true);
    try {
      const res = await fetch(`/api/messages/${message.id}/unlock`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setIsUnlocked(true);
      } else {
        if (data.error === "insufficient_balance") {
          toast.error("Недостаточно NC на балансе");
        } else {
          toast.error("Ошибка разблокировки");
        }
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setUnlocking(false);
    }
  }, [message.id, message.paidPrice, unlocking]);

  const handleViewOnce = React.useCallback(async () => {
    if (viewOnceViewed) return;
    try {
      const res = await fetch(`/api/messages/${message.id}/view-once`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setViewOnceViewed(true);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === "already_viewed") {
          setViewOnceViewed(true);
        } else {
          toast.error("Ошибка");
        }
      }
    } catch {
      toast.error("Ошибка сети");
    }
  }, [message.id, viewOnceViewed]);

  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenuPos({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleReply = React.useCallback(() => {
    onReply?.(message);
  }, [message, onReply]);

  const handleCopy = React.useCallback(async () => {
    const text = decryptedContent ?? message.content;
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // ignore — context menu shows visual feedback
      }
      fetch(`/api/messages/${message.id}/info`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy" }),
      }).catch(() => {});
    }
  }, [message.content, message.id, decryptedContent]);

  const handleEditStart = React.useCallback(() => {
    setEditValue(message.content ?? "");
    setIsEditing(true);
  }, [message.content]);

  const handleEditCancel = React.useCallback(() => {
    setIsEditing(false);
    setEditValue(message.content ?? "");
  }, [message.content]);

  const handleEditSave = React.useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === message.content) {
      handleEditCancel();
      return;
    }
    setIsSavingEdit(true);
    try {
      await onEdit?.(message.id, trimmed);
      setIsEditing(false);
    } catch {
      // restore on error
      setEditValue(message.content ?? "");
    } finally {
      setIsSavingEdit(false);
    }
  }, [editValue, message.id, message.content, onEdit, handleEditCancel]);

  const handleDelete = React.useCallback(async () => {
    const ok = window.confirm("Удалить сообщение?");
    if (!ok) return;
    try {
      await onDelete?.(message.id);
    } catch {
      // ignore — server returns 200 or error
    }
  }, [message.id, onDelete]);

  const handleForward = React.useCallback(() => {
    onForward?.(message);
  }, [message, onForward]);

  const handleCopyLink = React.useCallback(() => {
    const url = `${window.location.origin}/?chat=${message.chatId}&msg=${message.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, [message.chatId, message.id]);

  const handleSave = React.useCallback(() => {
    onSave?.(message);
  }, [message, onSave]);

  const handleSaveToCollection = React.useCallback(() => {
    onSaveToCollection?.(message);
  }, [message, onSaveToCollection]);

  const handleTogglePin = React.useCallback(() => {
    onTogglePin?.(message.id, !message.isPinned);
  }, [message.id, message.isPinned, onTogglePin]);

  const handleShowEditHistory = React.useCallback(async () => {
    setEditHistoryOpen(true);
    setEditHistoryLoading(true);
    try {
      const res = await fetch(`/api/messages/${message.id}/edits`);
      if (res.ok) {
        const data = (await res.json()) as { edits: typeof editHistory };
        setEditHistory(data.edits);
      }
    } catch {
      // ignore
    } finally {
      setEditHistoryLoading(false);
    }
  }, [message.id]);

  const handleRemind = React.useCallback(() => {
    setRemindOpen(true);
  }, []);

  const handleShowInfo = React.useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/messages/${message.id}/info`);
      if (res.ok) {
        const data = await res.json();
        setMessageInfo(data.data);
        setInfoPopoverPos({ x: e.clientX, y: e.clientY });
      }
    } catch {
      // ignore
    }
  }, [message.id]);

  const handleRemindSubmit = React.useCallback(async (remindAt: Date) => {
    setRemindOpen(false);
    try {
      const res = await fetch(`/api/messages/${message.id}/remind`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remindAt: remindAt.toISOString() }),
      });
      if (res.ok) {
        toast.success("Напоминание установлено");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === "remind_at_must_be_future" ? "Время должно быть в будущем" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  }, [message.id]);

  // ============================================================
  // Drag-to-reply (pointer-based, работает на touch + мыши)
  // ============================================================
  const [dragDx, setDragDx] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef<{
    x: number;
    y: number;
    pointerId: number;
    directionLocked: boolean | null;
  } | null>(null);

  const onPointerDownBubble = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Не перехватываем правый клик (для контекстного меню)
      if (e.button !== 0) return;
      // Если есть text selection — не мешаем
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) return;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
        directionLocked: null,
      };
    },
    [],
  );

  const onPointerMoveBubble = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Ждём первого существенного движения
      if (!isDragging) {
        if (absDx < DRAG_START_THRESHOLD && absDy < DRAG_START_THRESHOLD) return;
        // Решаем направление: для reply нам нужен свайп ВПРАВО (dx > 0) и чтобы он доминировал
        if (start.directionLocked === null) {
          if (absDx > absDy * DRAG_DIRECTION_RATIO && dx > 0) {
            start.directionLocked = true;
            setIsDragging(true);
          } else if (absDy > absDx * DRAG_DIRECTION_RATIO) {
            // вертикаль доминирует — отменяем
            start.directionLocked = false;
            return;
          } else {
            return;
          }
        } else if (start.directionLocked === false) {
          return;
        }
      }

      // Ограничиваем смещение
      const clamped = Math.max(0, Math.min(DRAG_MAX_PX, dx));
      setDragDx(clamped);
    },
    [isDragging],
  );

  const commitDrag = React.useCallback(() => {
    if (dragDx >= DRAG_COMMIT_PX) {
      // Haptic feedback на мобиле
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { (navigator as Navigator & { vibrate: (n: number) => void }).vibrate(15); } catch { /* ignore */ }
      }
      onReply?.(message);
    }
    setDragDx(0);
    setIsDragging(false);
    dragStartRef.current = null;
  }, [dragDx, message, onReply]);

  const onPointerUpBubble = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      if (isDragging) {
        commitDrag();
      } else {
        dragStartRef.current = null;
      }
    },
    [isDragging, commitDrag],
  );

  const onPointerCancelBubble = React.useCallback(() => {
    setDragDx(0);
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  return (
    <div
      ref={domRef}
      data-msg-id={message.id}
      data-idx={message.id}
      className={cn(
        "group/message relative flex w-full",
        isOutgoing ? "justify-end" : "justify-start",
        isCurrentSearchMatch && "rounded-md ring-2 ring-primary/60",
        bulkMode && "cursor-pointer",
        isProtected && "protected-content",
      )}
      onContextMenu={handleContextMenu}
      onPointerDown={onPointerDownBubble}
      onPointerMove={onPointerMoveBubble}
      onPointerUp={onPointerUpBubble}
      onPointerCancel={onPointerCancelBubble}
      onClick={(e) => {
        if (bulkMode) {
          e.stopPropagation();
          if (bulkSelected) {
            onBulkToggle?.(message.id);
          } else {
            onBulkToggle?.(message.id);
          }
        }
      }}
      style={{
        touchAction: "pan-y",
        contentVisibility: "auto",
        containIntrinsicSize: "0 64px",
      }}
    >
      {/* Bulk-select indicator */}
      {bulkMode && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center",
            isOutgoing ? "order-2 ml-2" : "order-1 mr-2",
          )}
        >
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
              bulkSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40 bg-background",
            )}
            aria-label={bulkSelected ? "Выбрано" : "Не выбрано"}
          >
            {bulkSelected && <Check className="h-3 w-3" />}
          </div>
        </div>
      )}
      {/* Drag-to-reply indicator (появляется справа при свайпе) */}
      {onReply && (
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 transition-opacity duration-150",
            isOutgoing ? "right-0" : "right-2",
          )}
          style={{
            opacity: Math.min(1, dragDx / DRAG_COMMIT_PX),
            transform: `translateY(-50%) translateX(${Math.max(0, dragDx - 32) * 0.3}px) scale(${0.8 + Math.min(0.4, dragDx / DRAG_COMMIT_PX * 0.4)})`,
          }}
        >
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md",
            )}
          >
            <CornerUpLeft className="h-4 w-4" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative z-10 flex max-w-[75%] flex-col transition-shadow",
          isOutgoing ? "items-end" : "items-start",
        )}
        style={{
          transform:
            isDragging || dragDx > 0
              ? `translateX(${dragDx}px) scale(${1 + Math.min(0.03, dragDx / 2000)})`
              : undefined,
          transition: isDragging
            ? "none"
            : "transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          // Лёгкая "тень" под пальцем при активном свайпе
          filter:
            isDragging && dragDx > 8
              ? `drop-shadow(0 ${Math.min(8, dragDx / 10)}px ${Math.min(20, dragDx / 4)}px rgba(0,0,0,0.25))`
              : undefined,
        }}
      >
        <div
          className={cn(
            "relative max-w-full break-words",
            isFirstInGroup && (isOutgoing ? "mt-2" : "mt-2"),
            !isFirstInGroup && "mt-0.5",
            // Стикеры не имеют пузыря — рендерим без фона/скруглений
            message.type === "STICKER"
              ? ""
              : cn(
                  // Bubble shape (Telegram-style rounded corners with one sharp)
                  isOutgoing
                    ? "rounded-l-xl rounded-r-md bg-bubble-outgoing text-bubble-outgoingFg"
                    : "rounded-r-xl rounded-l-md bg-bubble-incoming text-bubble-incomingFg",
                ),
          )}
        >
          {/* Sender name for groups */}
          {showSender && !isOutgoing && message.sender && (
            <div className="mb-0.5 px-[9px] pt-[3px]">
              <div
                className="flex items-center gap-1 text-[12.5px] font-semibold text-primary"
                style={(message.sender as any).accentColor ? { color: (message.sender as any).accentColor } : undefined}
              >
                {message.sender.displayName}
                {message.sender.premiumStatus === "active" && (
                  <Crown className="h-3 w-3 shrink-0 text-amber-500" />
                )}
                {isChatVerified && (
                  <CheckCheck
                    className="h-3 w-3 shrink-0 text-primary"
                    aria-label="verified"
                  />
                )}
              </div>
              {(message.sender as any).statusEmoji && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>{(message.sender as any).statusEmoji}</span>
                  <span>{(message.sender as any).statusText ?? (message.sender as any).customStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Forwarded-from label */}
          {message.forwardedFrom && (
            <div
              className={cn(
                "mx-1.5 mt-1 flex items-center gap-1.5 text-[11.5px] font-medium italic",
                isOutgoing
                  ? "text-bubble-outgoingFg/75"
                  : "text-foreground/70",
              )}
            >
              <Forward
                className={cn(
                  "h-3 w-3 shrink-0",
                  isOutgoing
                    ? "text-bubble-outgoingFg/70"
                    : "text-foreground/60",
                )}
              />
              <span className="truncate">
                {message.isStealth || message.isAnonymousForward ? (
                  "Анонимное сообщение"
                ) : (
                  <>
                    Переслано от{" "}
                    <span className="font-semibold not-italic">
                      {message.forwardedFrom.senderName}
                    </span>
                    {message.forwardedFrom.chatName && (
                      <>
                        {" "}
                        из{" "}
                        <span className="font-semibold not-italic">
                          «{message.forwardedFrom.chatName}»
                        </span>
                      </>
                    )}
                  </>
                )}
              </span>
            </div>
          )}

          {/* Reply quote */}
          {message.replyTo && (
            <ReplyQuote
              reply={message.replyTo}
              isOutgoing={isOutgoing}
              onClick={() => onReplyClick?.(message.replyTo!.id)}
            />
          )}

          {/* Media */}
          {message.mediaUrl && (
            message.isViewOnce && !message.isDeleted && !viewOnceViewed ? (
              <div
                className={cn(
                  "flex flex-col items-center gap-2 px-4 py-6",
                  isFirstInGroup
                    ? isOutgoing
                      ? "rounded-tl-xl rounded-tr-md"
                      : "rounded-tr-xl rounded-tl-md"
                    : "",
                )}
              >
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full",
                  isOutgoing ? "bg-bubble-outgoingFg/15" : "bg-primary/10",
                )}>
                  <Eye className="h-7 w-7" />
                </div>
                <p className={cn(
                  "text-sm font-medium",
                  isOutgoing ? "text-bubble-outgoingFg" : "text-foreground",
                )}>
                  {message.type === "VIDEO" ? "Одноразовое видео" : "Одноразовое фото"}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleViewOnce(); }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-opacity hover:brightness-110",
                    isOutgoing
                      ? "bg-white/15 text-white"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  Открыть
                </button>
              </div>
            ) : message.isViewOnce && message.isDeleted && !viewOnceViewed ? (
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm italic",
                isOutgoing ? "text-bubble-outgoingFg/50" : "text-muted-foreground",
              )}>
                <Eye className="h-4 w-4 shrink-0" />
                {message.type === "VIDEO" ? "Одноразовое видео просмотрено" : "Одноразовое фото просмотрено"}
              </div>
            ) : (
              <MediaContent
                message={message}
                isOutgoing={isOutgoing}
                isFirstInGroup={isFirstInGroup}
                onOpenLightbox={(images, startIndex) => setLightbox({ images, startIndex })}
                mediaGroup={mediaGroup}
              />
            )
          )}

          {/* Link preview */}
          {message.linkUrl && (
            <LinkPreview
              url={message.linkUrl}
              siteName={message.linkSiteName ?? null}
              title={message.linkTitle ?? null}
              description={message.linkDescription ?? null}
              image={message.linkImage ?? null}
              isOutgoing={isOutgoing}
            />
          )}

          {/* Inline keyboard */}
          {message.keyboard && message.keyboard.length > 0 && (
            <InlineKeyboard
              keyboard={message.keyboard}
              messageId={message.id}
              isOutgoing={isOutgoing}
            />
          )}

          {/* Caption (text) / edit form */}
          {isEditing ? (
            <div className="px-[9px] py-[6px]">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleEditSave();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    handleEditCancel();
                  }
                }}
                disabled={isSavingEdit}
                autoFocus
                rows={Math.min(6, Math.max(1, editValue.split("\n").length))}
                className={cn(
                  "w-full resize-none rounded border bg-background/80 px-2 py-1 text-sm",
                  "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                  isOutgoing
                    ? "text-bubble-outgoingFg placeholder:text-bubble-outgoingFg/40"
                    : "text-bubble-incomingFg placeholder:text-bubble-incomingFg/40",
                )}
              />
              <div className="mt-1 flex items-center justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleEditCancel}
                  disabled={isSavingEdit}
                  className="rounded px-2 py-0.5 transition-colors hover:bg-accent"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => void handleEditSave()}
                  disabled={isSavingEdit || !editValue.trim()}
                  className="rounded bg-primary px-2 py-0.5 font-medium text-primary-foreground transition-opacity hover:brightness-110 disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </div>
          ) : isPaidLocked ? (
            <div className="relative px-2.5 py-3">
              <div className="blur-sm select-none pointer-events-none line-clamp-3 text-sm opacity-60">
                {message.content ?? "Платный контент"}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-background/40 backdrop-blur-[2px]">
                <span className="text-2xl">🔒</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleUnlock(); }}
                  disabled={unlocking}
                  className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:brightness-110 disabled:opacity-50"
                >
                  {unlocking ? "..." : `Разблокировать · ${message.paidPrice} NC`}
                </button>
              </div>
            </div>
          ) : message.type === "CONTACT" && message.content ? (
            <ContactCard
              content={message.content}
              isOutgoing={isOutgoing}
              isFirstInGroup={isFirstInGroup}
            />
          ) : (
            (decryptedContent ?? message.content) && (
              <div
                className={cn(
                  "whitespace-pre-wrap px-2.5",
                  message.mediaUrl ? "pt-1" : "py-1",
                  isOutgoing
                    ? "text-bubble-outgoingFg"
                    : "text-bubble-incomingFg",
                )}
              >
                {searchQuery
                  ? highlightMatches(decryptedContent ?? message.content ?? "", searchQuery)
                  : renderWithMentions(decryptedContent ?? message.content ?? "")}
              </div>
            )
          )}

          {/* Meta row: time + status */}
          <div
            className={cn(
              "mt-0.5 flex items-center gap-1 px-2.5 pb-1 text-[10.5px]",
              isOutgoing
                ? "text-bubble-outgoingFg/55"
                : "text-bubble-incomingFg/55",
              message.type === "STICKER" &&
                (isOutgoing ? "text-foreground/60" : "text-muted-foreground"),
            )}
          >
            {message.isPinned && (
              <Pin
                className={cn(
                  "h-2.5 w-2.5",
                  isOutgoing ? "text-bubble-outgoingFg" : "text-primary",
                )}
                aria-label="Закреплено"
              />
            )}
            {message.isSilent && (
              <BellOff
                className={cn(
                  "h-2.5 w-2.5",
                  isOutgoing ? "text-bubble-outgoingFg" : "text-primary",
                )}
                aria-label="Тихое"
              />
            )}
            <span>{formatTime(new Date(message.createdAt))}</span>
            {message.isEdited && <span>ред.</span>}
            {isOutgoing && <StatusIcon status={status} />}
          </div>

          {/* Protected content shield indicator */}
          {isProtected && (
            <div
              className={cn(
                "flex items-center gap-1 px-2.5 pb-1 text-[10.5px]",
                isOutgoing
                  ? "text-bubble-outgoingFg/55"
                  : "text-bubble-incomingFg/55",
              )}
            >
              <svg
                className="h-2.5 w-2.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Protected</span>
            </div>
          )}
        </div>

        {/* Reactions */}
        <AnimatedReactionBar
          reactions={message.reactions ?? []}
          myUserId={myUserId}
          isOutgoing={isOutgoing}
          onToggle={(emoji) => onToggleReaction?.(message.id, emoji)}
        />

        {/* Smile button + picker — positioned at the chat-center side of the bubble */}
        {onToggleReaction && (
          <button
            ref={smileBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (pickerOpen) {
                setPickerOpen(false);
                setPickerPos(null);
              } else {
                openPicker();
                setPickerOpen(true);
              }
            }}
            aria-label="Реакция"
            className={cn(
              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center self-end rounded-full text-muted-foreground transition-opacity",
              "hover:bg-accent hover:text-foreground",
              "opacity-0 group-hover/message:opacity-100",
              pickerOpen && "opacity-100",
            )}
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      <MessageContextMenu
        open={menuPos !== null}
        position={menuPos}
        onClose={() => setMenuPos(null)}
        onReply={handleReply}
        onCopy={handleCopy}
        onEdit={canEdit ? handleEditStart : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onForward={onForward ? handleForward : undefined}
        onCopyLink={onCopyLink ? handleCopyLink : undefined}
        onSave={onSave ? handleSave : undefined}
        onSaveToCollection={onSaveToCollection ? handleSaveToCollection : undefined}
        onTogglePin={onTogglePin ? handleTogglePin : undefined}
        onShowEditHistory={message.isEdited ? handleShowEditHistory : undefined}
        onRemind={handleRemind}
        isPinned={message.isPinned ?? false}
        isEdited={message.isEdited ?? false}
        isOutgoing={isOutgoing}
        isProtected={isProtected}
        onReport={onReport && !isOutgoing ? () => onReport(message.id, message.senderId) : undefined}
        onShowInfo={onShowInfo ? handleShowInfo : undefined}
        onSelect={
          onBulkToggle
            ? () => {
                onEnterBulkMode?.(message.id);
                onBulkToggle(message.id);
              }
            : undefined
        }
      />

      {/* Edit History Modal */}
      {editHistoryOpen && (
        <EditHistoryModal
          edits={editHistory}
          loading={editHistoryLoading}
          onClose={() => {
            setEditHistoryOpen(false);
            setEditHistory([]);
          }}
        />
      )}

      {/* Remind Picker */}
      {remindOpen && (
        <RemindPicker
          onRemind={handleRemindSubmit}
          onClose={() => setRemindOpen(false)}
        />
      )}

      {/* Message Info Popover */}
      {infoPopoverPos && messageInfo &&
        createPortal(
          <div
            className="fixed z-[200]"
            style={{ left: infoPopoverPos.x, top: infoPopoverPos.y }}
            onClick={(e) => {
              e.stopPropagation();
              setMessageInfo(null);
              setInfoPopoverPos(null);
            }}
          >
            <div
              className="rounded-lg border border-border bg-popover p-3 shadow-lg animate-in fade-in-0 zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Информация</div>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>Просмотров: <span className="font-medium">{messageInfo.viewCount}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Forward className="h-4 w-4 text-muted-foreground" />
                  <span>Пересылок: <span className="font-medium">{messageInfo.forwardCount}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  <span>Копирований: <span className="font-medium">{messageInfo.copyCount}</span></span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      }

      {/* Forward Anonymous Dialog — removed, now integrated in ForwardModal */}

      {pickerOpen && pickerPos &&
        createPortal(
          <div
            className="fixed z-[200]"
            style={{
              left: `${pickerPos.x}px`,
              top: `${Math.max(8, pickerPos.y - 8)}px`,
              transform: "translate(-50%, -100%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <EmojiPicker
              open
              isPremium={isPremium}
              onSelect={(emoji) => {
                setPickerOpen(false);
                setPickerPos(null);
                onToggleReaction?.(message.id, emoji);
              }}
              onClose={() => {
                setPickerOpen(false);
                setPickerPos(null);
              }}
              className="relative"
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

const MessageBubbleMemo = React.memo(MessageBubble, (a, b) => {
  return (
    a.message === b.message &&
    a.isOutgoing === b.isOutgoing &&
    a.isFirstInGroup === b.isFirstInGroup &&
    a.isLastInGroup === b.isLastInGroup &&
    a.showSender === b.showSender &&
    a.myUserId === b.myUserId &&
    a.searchQuery === b.searchQuery &&
    a.isCurrentSearchMatch === b.isCurrentSearchMatch &&
    a.mediaGroup === b.mediaGroup &&
    a.isChatVerified === b.isChatVerified &&
    a.isChatContentProtected === b.isChatContentProtected &&
    a.bulkSelected === b.bulkSelected &&
    a.bulkMode === b.bulkMode &&
    a.onToggleReaction === b.onToggleReaction &&
    a.onReply === b.onReply &&
    a.onReplyClick === b.onReplyClick &&
    a.onEdit === b.onEdit &&
    a.onDelete === b.onDelete &&
    a.onForward === b.onForward &&
    a.onSave === b.onSave &&
    a.onTogglePin === b.onTogglePin &&
    a.onShowInfo === b.onShowInfo &&
    a.domRef === b.domRef
  );
});

function MessageBubbleWrapper(props: MessageBubbleProps) {
  return <MessageBubbleMemo {...props} />;
}

export { MessageBubbleWrapper as MessageBubble };

function ReplyQuote({
  reply,
  isOutgoing,
  onClick,
}: {
  reply: ReplyPreview;
  isOutgoing: boolean;
  onClick?: () => void;
}) {
  const senderName = reply.sender.displayName;
  const excerpt = reply.content
    ? reply.content
    : reply.type === "IMAGE"
      ? "📷 Фото"
      : reply.type === "VIDEO"
        ? "🎥 Видео"
        : reply.type === "AUDIO"
          ? "🎵 Аудио"
          : reply.type === "VOICE"
            ? "🎤 Голосовое"
            : reply.type === "FILE"
              ? `📎 ${reply.fileName ?? "Файл"}`
              : "";
  return (
    <button
      type="button"
      onClick={onClick}
      title="Перейти к сообщению"
      className={cn(
        "mx-1.5 mt-1 flex w-full max-w-full items-stretch gap-1.5 overflow-hidden rounded-md border-l-2 px-2 py-1 text-left transition-opacity",
        isOutgoing
          ? "border-bubble-outgoingFg/40 bg-bubble-outgoingFg/5 hover:bg-bubble-outgoingFg/10"
          : "border-primary/60 bg-foreground/[0.04] hover:bg-foreground/[0.08]",
        onClick && "cursor-pointer",
      )}
    >
      <CornerUpRight
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isOutgoing ? "text-bubble-outgoingFg/60" : "text-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[12px] font-semibold",
            isOutgoing ? "text-bubble-outgoingFg" : "text-primary",
          )}
        >
          {senderName}
        </div>
        <div
          className={cn(
            "truncate text-[12.5px]",
            isOutgoing
              ? "text-bubble-outgoingFg/70"
              : "text-foreground/70",
          )}
        >
          {excerpt}
        </div>
      </div>
    </button>
  );
}

function InlineKeyboard({
  keyboard,
  messageId,
  isOutgoing,
}: {
  keyboard: NonNullable<MessageDTO["keyboard"]>;
  messageId: string;
  isOutgoing: boolean;
}) {
  const handleClick = React.useCallback(
    async (button: { url?: string; callback_data?: string }) => {
      if (button.url) {
        window.open(button.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (button.callback_data) {
        try {
          await fetch("/api/messages/callback", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageId,
              data: button.callback_data,
            }),
          });
        } catch {
          // ignore
        }
      }
    },
    [messageId],
  );
  return (
    <div className="mx-2.5 mb-1.5 grid w-full max-w-full grid-cols-1 gap-1">
      {keyboard.map((row, ri) => (
        <div
          key={ri}
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
          }}
        >
          {row.map((b, bi) => (
            <button
              key={bi}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleClick(b);
              }}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-center text-[13px] font-medium transition-opacity hover:opacity-90",
                isOutgoing
                  ? "bg-white/15 text-white"
                  : "bg-primary/10 text-primary",
              )}
            >
              {b.text}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function LinkPreview({
  url,
  siteName,
  title,
  description,
  image,
  isOutgoing,
}: {
  url: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  isOutgoing: boolean;
}) {
  const displayHost = siteName ?? (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "mx-2.5 mb-1.5 flex max-w-full items-stretch gap-2 overflow-hidden rounded-lg border text-left text-sm transition-opacity hover:opacity-90",
        isOutgoing
          ? "border-white/20 bg-white/10"
          : "border-border bg-background",
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="h-20 w-20 shrink-0 object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            "flex h-20 w-20 shrink-0 items-center justify-center text-2xl font-bold",
            isOutgoing
              ? "bg-white/15 text-white/80"
              : "bg-muted text-muted-foreground",
          )}
        >
          {displayHost.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1 py-1.5 pr-2">
        <div
          className={cn(
            "truncate text-[10.5px] font-medium uppercase tracking-wide",
            isOutgoing ? "text-white/60" : "text-muted-foreground",
          )}
        >
          {displayHost}
        </div>
        <div
          className={cn(
            "line-clamp-2 text-[13px] font-medium",
            isOutgoing ? "text-white" : "text-foreground",
          )}
        >
          {title ?? displayHost}
        </div>
        {description && (
          <div
            className={cn(
              "line-clamp-1 text-[11px]",
              isOutgoing ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {description}
          </div>
        )}
      </div>
    </a>
  );
}

function MediaContent({
  message,
  isOutgoing,
  isFirstInGroup,
  onOpenLightbox,
  mediaGroup,
}: {
  message: MessageDTO;
  isOutgoing: boolean;
  isFirstInGroup: boolean;
  onOpenLightbox: (images: { url: string; fileName?: string }[], startIndex: number) => void;
  mediaGroup?: { images: { url: string; fileName?: string }[]; startIndex: number } | null;
}) {
  const url = message.mediaUrl!;

  if (message.type === "IMAGE") {
    if (mediaGroup) {
      // Group of 2+ images — render as grid
      const { images, startIndex } = mediaGroup;
      const count = images.length;
      const isFirst = startIndex === 0;
      const isLast = startIndex === count - 1;
      const cellShape = cn(
        "relative block overflow-hidden",
        isFirst
          ? isOutgoing
            ? "rounded-tl-xl"
            : "rounded-tr-xl"
          : "",
        isLast
          ? isOutgoing
            ? "rounded-bl-xl"
            : "rounded-br-xl"
          : "",
      );
      return (
        <div
          className={cn(
            "relative max-w-[420px] overflow-hidden",
            isFirst
              ? isOutgoing
                ? "rounded-tl-xl rounded-tr-md"
                : "rounded-tr-xl rounded-tl-md"
              : "",
            count === 1 && "rounded-bl-xl rounded-br-md",
          )}
          onClick={() => onOpenLightbox(images, startIndex)}
        >
          <div
            className={cn(
              "grid gap-0.5 bg-black/5",
              count === 1 && "grid-cols-1",
              count === 2 && "grid-cols-2",
              count >= 3 && "grid-cols-2",
            )}
          >
            {images.slice(0, 4).map((img, idx) => {
              const overflow = count - 4;
              const showOverlay = overflow > 0 && idx === 3;
              return (
                <div
                  key={img.url + idx}
                  className={cn(
                    "relative",
                    idx === 0 ? cellShape : "",
                    idx === count - 1 && idx !== 0
                      ? isOutgoing
                        ? "rounded-bl-xl"
                        : "rounded-br-xl"
                      : "",
                  )}
                  style={{ aspectRatio: count === 1 ? "auto" : "1/1" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.fileName ?? `image ${idx + 1}`}
                    loading="lazy"
                    className={cn(
                      "block h-full w-full object-cover",
                      count === 1 && "max-h-80 object-contain",
                    )}
                  />
                  {showOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-2xl font-semibold text-white">
                      +{overflow + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox([{ url, fileName: message.fileName ?? undefined }], 0)}
        className={cn(
          "block max-w-full overflow-hidden",
          isFirstInGroup
            ? isOutgoing
              ? "rounded-tl-xl rounded-tr-md"
              : "rounded-tr-xl rounded-tl-md"
            : "",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={message.fileName ?? "image"}
          loading="lazy"
          className="block max-h-80 max-w-full object-cover"
        />
      </button>
    );
  }

  if (message.type === "VIDEO") {
    const hasHls = !!(message as any).hlsUrl;
    return (
      <div className="relative">
        {hasHls ? (
          <HLSPlayer src={(message as any).hlsUrl} poster={message.thumbnailUrl ?? undefined} className="max-w-[320px]" messageId={message.id} />
        ) : (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video
            src={url}
            controls
            preload="metadata"
            className="block max-h-80 max-w-full"
          />
        )}
        <VideoTranscriptButton messageId={message.id} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (message.type === "VIDEO_CIRCLE") {
    return (
      <div className="relative flex justify-center">
        <button
          type="button"
          onClick={() => onOpenLightbox([{ url, fileName: message.fileName ?? undefined }], 0)}
          className="block h-32 w-32 overflow-hidden rounded-full border-2 border-primary/30"
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={url}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        </button>
      </div>
    );
  }

  if (message.type === "STICKER") {
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox([{ url, fileName: message.fileName ?? undefined }], 0)}
        className="block max-w-[200px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={message.fileName ?? "sticker"}
          loading="lazy"
          className="block max-h-44 w-auto object-contain"
        />
      </button>
    );
  }

  if (message.type === "VOICE") {
    return (
      <div className="flex flex-col gap-1.5">
        <VoicePlayer
          src={url}
          durationSec={message.fileSize ?? undefined}
          isOutgoing={isOutgoing}
          messageId={message.id}
        />
        {message.content && (
          <p
            className={cn(
              "max-w-[280px] whitespace-pre-wrap break-words px-2.5 text-[13px] italic",
              isOutgoing ? "text-bubble-outgoingFg/80" : "text-bubble-incomingFg/80",
            )}
          >
            {message.content}
          </p>
        )}
      </div>
    );
  }

  if (message.type === "VOICE_POST") {
    return (
      <div className="flex flex-col gap-1.5">
        <VoicePost
          src={url}
          durationSec={message.fileSize}
          isOutgoing={isOutgoing}
        />
        {message.content && (
          <p
            className={cn(
              "max-w-[280px] whitespace-pre-wrap break-words px-2.5 text-[13px]",
              isOutgoing ? "text-bubble-outgoingFg/80" : "text-bubble-incomingFg/80",
            )}
          >
            {message.content}
          </p>
        )}
      </div>
    );
  }

  if (message.type === "LOCATION") {
    // content = "lat,lng"; linkTitle = optional place name
    const [latStr, lngStr] = (message.content ?? "").split(",");
    const lat = Number(latStr);
    const lng = Number(lngStr);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const isLive = !!(message as any).liveLocationMinutes && (message as any).liveLocationMinutes > 0;
    const expiresAt = (message as any).liveLocationExpiresAt ? new Date((message as any).liveLocationExpiresAt) : null;
    const isExpired = expiresAt ? expiresAt < new Date() : false;
    const minutesAgo = isLive && (message as any).updatedAt
      ? Math.max(0, Math.floor((Date.now() - new Date((message as any).updatedAt).getTime()) / 60000))
      : null;
    const osmHref = hasCoords
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
      : "#";
    const osmEmbedUrl = hasCoords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
      : "";
    return (
      <a
        href={osmHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group/loc block w-full max-w-[300px] overflow-hidden rounded-lg no-underline",
          isOutgoing
            ? "bg-white/10 hover:bg-white/15"
            : "bg-primary/5 hover:bg-primary/10",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-black/10">
          {hasCoords ? (
            <iframe
              src={osmEmbedUrl}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer"
              title="Карта"
            />
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center",
                isOutgoing
                  ? "bg-gradient-to-br from-emerald-700/60 to-emerald-900/60"
                  : "bg-gradient-to-br from-emerald-500/30 to-emerald-700/30",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
          )}
          {isLive && !isExpired && (
            <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="text-[10px] font-medium text-white">LIVE</span>
            </div>
          )}
        </div>
        <div className="px-2.5 py-1.5">
          <p
            className={cn(
              "text-[13px] font-medium",
              isOutgoing ? "text-white" : "text-foreground",
            )}
          >
            {(message as any).locationName || message.linkTitle || "Геопозиция"}
          </p>
          {hasCoords && (
            <p
              className={cn(
                "text-[11px] tabular-nums",
                isOutgoing ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}
          {isLive && !isExpired && minutesAgo !== null && (
            <p
              className={cn(
                "flex items-center gap-1 text-[11px]",
                isOutgoing ? "text-white/60" : "text-muted-foreground",
              )}
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              {minutesAgo === 0
                ? "Обновлено только что"
                : `Обновлено ${minutesAgo} мин. назад`}
            </p>
          )}
          {isLive && isExpired && (
            <p
              className={cn(
                "text-[11px] italic",
                isOutgoing ? "text-white/40" : "text-muted-foreground/60",
              )}
            >
              Местоположение более не обновляется
            </p>
          )}
          {isLive && !isExpired && expiresAt && (
            <p
              className={cn(
                "text-[10px]",
                isOutgoing ? "text-white/40" : "text-muted-foreground/60",
              )}
            >
              До {expiresAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </a>
    );
  }

  if (message.type === "AUDIO") {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            isOutgoing
              ? "bg-bubble-outgoingFg/15"
              : "bg-bubble-incomingFg/15",
          )}
        >
          <Music className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 truncate text-sm font-medium">
          {message.fileName ?? "Аудио"}
          {message.fileSize != null && (
            <div
              className={cn(
                "text-[11px] font-normal",
                isOutgoing
                  ? "text-bubble-outgoingFg/60"
                  : "text-foreground/60",
              )}
            >
              {formatSize(message.fileSize)}
            </div>
          )}
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          src={url}
          controls
          preload="metadata"
          className="h-8 max-w-[200px]"
        />
      </div>
    );
  }

  // POLL
  if (message.type === "POLL" && message.poll) {
    return (
      <PollCard
        poll={message.poll}
        messageId={message.id}
        isOutgoing={isOutgoing}
      />
    );
  }

  // TASK LIST
  if (message.type === "TASK_LIST" && message.taskItems) {
    return (
      <div
        className={cn(
          "min-w-[200px] max-w-[340px] px-3 py-2",
          isOutgoing
            ? "rounded-l-xl rounded-r-md bg-bubble-outgoing text-bubble-outgoingFg"
            : "rounded-r-xl rounded-l-md bg-bubble-incoming text-bubble-incomingFg",
        )}
      >
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-60">
          Список задач
        </p>
        <div className="space-y-1">
          {message.taskItems
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((task) => (
              <label
                key={task.id}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    task.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : isOutgoing
                        ? "border-bubble-outgoingFg/40"
                        : "border-foreground/30",
                  )}
                >
                  {task.done && (
                    <CheckCheck className="h-3 w-3" />
                  )}
                </span>
                <span className={task.done ? "line-through opacity-50" : ""}>
                  {task.text}
                </span>
              </label>
            ))}
        </div>
      </div>
    );
  }

  // FILE
  return (
    <a
      href={url}
      download={message.fileName ?? "file"}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 transition-colors",
        isOutgoing
          ? "hover:bg-bubble-outgoingFg/10"
          : "hover:bg-bubble-incomingFg/10",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          isOutgoing
            ? "bg-bubble-outgoingFg/15"
            : "bg-bubble-incomingFg/15",
        )}
      >
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {message.fileName ?? "Файл"}
        </div>
        {message.fileSize != null && (
          <div
            className={cn(
              "text-[11px]",
              isOutgoing
                ? "text-bubble-outgoingFg/60"
                : "text-bubble-incomingFg/60",
            )}
          >
            {formatSize(message.fileSize)}
          </div>
        )}
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  );
}

function StatusIcon({ status }: { status: NonNullable<MessageDTO["status"]> }) {
  if (status === "sending") {
    return <Check className="h-3 w-3 opacity-50" />;
  }
  if (status === "error") {
    return <span className="text-destructive">!</span>;
  }
  if (status === "read") {
    return <CheckCheck className="h-3 w-3 text-primary" />;
  }
  return <CheckCheck className="h-3 w-3 opacity-60" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function highlightMatches(
  text: string,
  query: string,
): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return text;
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={`m-${key++}`}
        className="rounded bg-primary/30 px-0.5 text-inherit"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  return parts;
}

function renderWithMentions(text: string): React.ReactNode {
  if (!text) return text;

  // Format text with mentions + Telegram formatting (including spoilers, quotes, etc.)
  return formatMentionText(text, "");
}

/** Highlight @mentions and apply Telegram formatting to a text segment */
function formatMentionText(text: string, keyPrefix: string): React.ReactNode {
  const re = /(?:^|\s)(@[A-Za-z0-9_]{3,32})/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const tokenStart = match[1].startsWith("@") ? match.index : match.index + 1;
    if (tokenStart > lastIdx) {
      parts.push(
        <React.Fragment key={`t${keyPrefix}-${key++}`}>
          {renderTimecodes(text.slice(lastIdx, tokenStart))}
        </React.Fragment>,
      );
    }
    parts.push(
      <span
        key={`m${keyPrefix}-${key++}`}
        className="rounded bg-primary/20 px-0.5 font-medium text-primary"
      >
        {match[1]}
      </span>,
    );
    lastIdx = tokenStart + match[1].length;
  }
  if (lastIdx < text.length) {
    parts.push(
      <React.Fragment key={`t${keyPrefix}-${key++}`}>
        {renderTimecodes(text.slice(lastIdx))}
      </React.Fragment>,
    );
  }
  return parts.length === 0 ? renderTimecodes(text) : parts;
}

function PollCard({
  poll,
  messageId,
  isOutgoing,
}: {
  poll: NonNullable<MessageDTO["poll"]>;
  messageId: string;
  isOutgoing: boolean;
}) {
  const [voting, setVoting] = React.useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const totalVotes = poll.options.reduce((sum, o) => sum + (o.count ?? o.votes ?? 0), 0);

  const handleVote = async (optionId: string) => {
    if (voting || poll.isClosed) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/messages/${messageId}/vote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      if (!res.ok) throw new Error("vote_failed");
    } catch {
      // ignore — poll:updated from socket will revert
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="min-w-[220px] max-w-[300px] px-3 py-2">
      <p
        className={cn(
          "mb-2 text-[14px] font-medium",
          isOutgoing ? "text-white" : "text-foreground",
        )}
      >
        {poll.question}
      </p>
      <div className="flex flex-col gap-1.5">
        {poll.options.map((opt) => {
          const count = opt.count ?? opt.votes ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = currentUser?.id ? (opt.userIds ?? []).includes(currentUser.id) : false;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => void handleVote(opt.id)}
              disabled={poll.isClosed || voting}
              className={cn(
                "relative overflow-hidden rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
                isOutgoing
                  ? "border-white/20 hover:bg-white/10"
                  : "border-border hover:bg-accent",
                isSelected && "border-primary/40",
              )}
            >
              {/* Background bar */}
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-300",
                  isOutgoing ? "bg-white/10" : "bg-primary/10",
                )}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span
                  className={cn(
                    isOutgoing ? "text-white" : "text-foreground",
                    isSelected && "font-medium",
                  )}
                >
                  {opt.text}
                </span>
                <span
                  className={cn(
                    "ml-2 text-[11px] tabular-nums",
                    isOutgoing ? "text-white/60" : "text-muted-foreground",
                  )}
                >
                  {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p
        className={cn(
          "mt-1.5 text-[11px]",
          isOutgoing ? "text-white/50" : "text-muted-foreground",
        )}
      >
        {totalVotes} {totalVotes === 1 ? "голос" : totalVotes < 5 ? "голоса" : "голосов"}
        {poll.isClosed && " · завершён"}
      </p>
    </div>
  );
}

function VideoTranscriptButton({
  messageId,
  isOutgoing,
}: {
  messageId: string;
  isOutgoing: boolean;
}) {
  const [transcript, setTranscript] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleTranscribe = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${messageId}/transcribe-video`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setTranscript(data.transcript);
      } else {
        setError(data.error === "transcription_unavailable"
          ? "Транскриция недоступна"
          : "Ошибка транскрипции");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }, [messageId, loading]);

  if (transcript) {
    return (
      <div
        className={cn(
          "mt-1 rounded-md border px-2.5 py-1.5 text-[12.5px]",
          isOutgoing
            ? "border-white/20 bg-white/10 text-white/90"
            : "border-border bg-muted/50 text-foreground/80",
        )}
      >
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">
          Транскрипция
        </p>
        <p className="whitespace-pre-wrap">{transcript}</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="mt-1 text-[11px] text-destructive">{error}</p>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void handleTranscribe();
      }}
      disabled={loading}
      className={cn(
        "mt-1 rounded-full px-3 py-1 text-[11px] font-medium transition-opacity hover:brightness-110 disabled:opacity-50",
        isOutgoing
          ? "bg-white/15 text-white"
          : "bg-primary/10 text-primary",
      )}
    >
      {loading ? "Расшифровка..." : "Расшифровать"}
    </button>
  );
}

function RemindPicker({
  onRemind,
  onClose,
}: {
  onRemind: (date: Date) => void;
  onClose: () => void;
}) {
  const presets = React.useMemo(() => {
    const now = new Date();
    return [
      { label: "Через 1 час", date: new Date(now.getTime() + 60 * 60 * 1000) },
      { label: "Через 3 часа", date: new Date(now.getTime() + 3 * 60 * 60 * 1000) },
      { label: "Завтра в 9:00", date: (() => { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; })() },
      { label: "Через неделю", date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    ];
  }, []);

  const [customDate, setCustomDate] = React.useState<string>("");
  const [showCustom, setShowCustom] = React.useState(false);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-xs overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Напомнить</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="p-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onRemind(p.date)}
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              {p.label}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          {!showCustom ? (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              Кастомное время
            </button>
          ) : (
            <div className="px-2 py-1">
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mb-2 w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                min={new Date().toISOString().slice(0, 16)}
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="flex-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={!customDate}
                  onClick={() => {
                    if (customDate) onRemind(new Date(customDate));
                  }}
                  className="flex-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  content,
  isOutgoing,
  isFirstInGroup,
}: {
  content: string;
  isOutgoing: boolean;
  isFirstInGroup: boolean;
}) {
  let contact: { userId: string; displayName: string; username: string; avatarUrl: string | null };
  try {
    contact = JSON.parse(content);
  } catch {
    return (
      <div className="px-2.5 py-1 text-sm italic opacity-60">Контакт</div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5",
        isFirstInGroup
          ? isOutgoing
            ? "rounded-tl-xl rounded-tr-md"
            : "rounded-tr-xl rounded-tl-md"
          : "",
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-medium text-muted-foreground">
        {contact.avatarUrl ? (
          <img
            src={contact.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          contact.displayName.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[14px] font-semibold",
            isOutgoing ? "text-bubble-outgoingFg" : "text-foreground",
          )}
        >
          {contact.displayName}
        </div>
        <div
          className={cn(
            "truncate text-[12px]",
            isOutgoing
              ? "text-bubble-outgoingFg/60"
              : "text-muted-foreground",
          )}
        >
          @{contact.username}
        </div>
      </div>
      <a
        href={`/?user=${contact.userId}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-opacity hover:brightness-110",
          isOutgoing
            ? "bg-white/15 text-white"
            : "bg-primary/10 text-primary",
        )}
      >
        Написать
      </a>
    </div>
  );
}
