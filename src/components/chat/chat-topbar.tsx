"use client";

import * as React from "react";
import { Phone, Search, ArrowLeft, Megaphone, Video, FileText, Sparkles, X, PenSquare, Zap, List } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatLastSeen } from "@/lib/utils";
import { toast } from "@/store/toast-store";
import { ChannelDraftsModal } from "./channel-drafts-modal";
import { BoostModal } from "./boost-modal";
import { QuickNavigation } from "./quick-navigation";

interface ChatTopBarProps {
  name: string;
  avatarUrl?: string | null;
  isGroup?: boolean;
  isChannel?: boolean;
  isService?: boolean;
  isSelf?: boolean;
  memberCount?: number;
  isOnline?: boolean;
  lastSeenAt?: number;
  typingText?: string | null;
  isLive?: boolean;
  onOpenProfile?: () => void;
  onBack?: () => void;
  onSearch?: () => void;
  onCallAudio?: () => void;
  onCallVideo?: () => void;
  onGroupCall?: () => void;
  chatId?: string;
  className?: string;
  onInsertGeneratedPost?: (content: string) => void;
  isOwner?: boolean;
  onDraftsSelect?: (content: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

export function ChatTopBar({
  name,
  avatarUrl,
  isGroup,
  isChannel,
  isService,
  isSelf,
  memberCount,
  isOnline,
  lastSeenAt,
  typingText,
  isLive,
  onOpenProfile,
  onBack,
  onSearch,
  onCallAudio,
  onCallVideo,
  onGroupCall,
  chatId,
  className,
  onInsertGeneratedPost,
  isOwner,
  onDraftsSelect,
  onJumpToMessage,
}: ChatTopBarProps) {
  const [summarizing, setSummarizing] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [draftsOpen, setDraftsOpen] = React.useState(false);
  const [boostOpen, setBoostOpen] = React.useState(false);
  const [quickNavOpen, setQuickNavOpen] = React.useState(false);

  const handleSummarize = async () => {
    if (!chatId || summarizing) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, messageCount: 50 }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.info(data.summary);
      } else {
        if (data.error === "premium_required") {
          toast.error("Требуется подписка AI Chat");
        } else if (data.error === "no_messages") {
          toast.error("Нет сообщений для сводки");
        } else {
          toast.error("Ошибка генерации сводки");
        }
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSummarizing(false);
    }
  };
  const subtitle = typingText
    ? typingText
    : isChannel
      ? `${memberCount ?? 0} подписчиков`
      : isGroup
        ? `${memberCount ?? 0} участников`
        : isOnline
          ? "в сети"
          : lastSeenAt
            ? `был(а) ${formatLastSeen(lastSeenAt)}`
            : "";

  return (
    <>
    <header
      className={cn(
        "flex h-14 items-center gap-3 border-b border-border bg-background px-3",
        className,
      )}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <button
        type="button"
        onClick={onOpenProfile}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition-colors hover:bg-accent/50"
      >
        <Avatar
          name={name}
          src={avatarUrl}
          size="md"
          online={!isGroup && !isChannel && isOnline}
        />
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1">
            {isChannel && (
              <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
            <span className="truncate text-[15px] font-semibold">{name}</span>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <span
            className={cn(
              "truncate text-[12.5px]",
              typingText ? "text-primary" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        </div>
      </button>

      {!isChannel && (
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Поиск"
        >
          <Search className="h-4.5 w-4.5" />
        </button>
      )}
      {!isChannel && chatId && (
        <button
          type="button"
          onClick={() => setQuickNavOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Быстрая навигация"
          title="Быстрая навигация"
        >
          <List className="h-4.5 w-4.5" />
        </button>
      )}
      {(isGroup || isChannel) && chatId && (
        <button
          type="button"
          onClick={handleSummarize}
          disabled={summarizing}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          aria-label="Сводка чата"
          title="AI Сводка"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline">{summarizing ? "..." : "Сводка"}</span>
        </button>
      )}
      {isChannel && chatId && (
        <button
          type="button"
          onClick={() => setGenerateOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Сгенерировать пост"
          title="AI Генерация поста"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline">Сгенерировать</span>
        </button>
      )}
      {isChannel && isOwner && chatId && (
        <button
          type="button"
          onClick={() => setDraftsOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Черновики"
          title="Черновики канала"
        >
          <PenSquare className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline">Черновики</span>
        </button>
      )}
      {isChannel && !isOwner && chatId && (
        <button
          type="button"
          onClick={() => setBoostOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Буст"
          title="Буст канала"
        >
          <Zap className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline">Буст</span>
        </button>
      )}
      {!isGroup && !isChannel && !isService && !isSelf && (
        <>
          <button
            type="button"
            onClick={onCallAudio}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Голосовой звонок"
          >
            <Phone className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={onCallVideo}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            aria-label="Видеозвонок"
          >
            <Video className="h-4.5 w-4.5" />
          </button>
        </>
      )}
      {isGroup && !isChannel && (
        <button
          type="button"
          onClick={onGroupCall}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Групповой звонок"
        >
          <Phone className="h-4.5 w-4.5" />
        </button>
      )}
    </header>
    {generateOpen && (
      <GeneratePostModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onInsert={(content) => onInsertGeneratedPost?.(content)}
      />
    )}
    {draftsOpen && chatId && (
      <ChannelDraftsModal
        open={draftsOpen}
        onClose={() => setDraftsOpen(false)}
        chatId={chatId}
        onSelect={(content) => onDraftsSelect?.(content)}
      />
    )}
    {boostOpen && chatId && (
      <BoostModal
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
        chatId={chatId}
      />
    )}
    {quickNavOpen && chatId && (
      <QuickNavigation
        open={quickNavOpen}
        onClose={() => setQuickNavOpen(false)}
        chatId={chatId}
        onJumpToMessage={onJumpToMessage}
      />
    )}
    </>
  );
}

function GeneratePostModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (content: string) => void;
}) {
  const [style, setStyle] = React.useState<"news" | "announcement" | "casual" | "educational">("casual");
  const [length, setLength] = React.useState<"short" | "medium" | "long">("medium");
  const [topic, setTopic] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [result, setResult] = React.useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/generate-post", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelTopic: topic || "Общий контент", style, length, topic: topic || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.content);
      } else {
        if (data.error === "premium_required") {
          toast.error("Требуется подписка AI Chat");
        } else {
          toast.error("Ошибка генерации");
        }
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Генерация поста
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Тема</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="О чём пост? (например: обновление продукта)"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Стиль</label>
            <div className="flex gap-1.5">
              {(["news", "announcement", "casual", "educational"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs transition-colors",
                    style === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {s === "news" ? "Новости" : s === "announcement" ? "Объявление" : s === "casual" ? " casual" : "Образование"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Длина</label>
            <div className="flex gap-1.5">
              {(["short", "medium", "long"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLength(l)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs transition-colors",
                    length === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {l === "short" ? "Короткий" : l === "medium" ? "Средний" : "Длинный"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? "Генерация..." : "Сгенерировать"}
          </button>

          {result && (
            <div className="space-y-2">
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                {result}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(result); toast.success("Скопировано"); }}
                  className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Копировать
                </button>
                <button
                  type="button"
                  onClick={() => { onInsert(result); onClose(); }}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Вставить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
