"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  X,
  Star,
  Download,
  Bot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface BotDetail {
  id: string;
  name: string;
  username: string;
  description: string | null;
  longDescription: string | null;
  avatarUrl: string | null;
  category: string;
  installCount: number;
  rating: number;
  screenshots: string[];
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface BotDetailModalProps {
  bot: BotDetail;
  onClose: () => void;
  onInstalled?: () => void;
}

const CATEGORY_MAP: Record<string, string> = {
  support: "Поддержка",
  sales: "Продажи",
  games: "Игры",
  ai: "AI",
  automation: "Автоматизация",
  music: "Музыка",
  news: "Новости",
  other: "Другое",
};

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            sz,
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

export function BotDetailModal({ bot, onClose, onInstalled }: BotDetailModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [screenshotIdx, setScreenshotIdx] = React.useState(0);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  React.useEffect(() => {
    if (!mounted) return;
    const checkInstalled = async () => {
      try {
        const res = await fetch(`/api/bots/market/${bot.id}/install`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setInstalled(data.installed ?? false);
        }
      } catch {
        // ignore
      }
    };
    checkInstalled();
  }, [mounted, bot.id]);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const res = await fetch(`/api/bots/market/${bot.id}/install`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setInstalled(true);
        toast.success("Бот установлен!");
        onInstalled?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Ошибка установки");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setInstalling(false);
    }
  };

  if (!mounted) return null;

  const screenshots = bot.screenshots ?? [];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      aria-hidden={!mounted}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-label={bot.name}
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {bot.avatarUrl ? (
              <img
                src={bot.avatarUrl}
                alt={bot.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold">{bot.name}</h2>
              <div className="text-sm text-muted-foreground">
                @{bot.username}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-3 pb-4">
            <Badge variant="outline">
              {CATEGORY_MAP[bot.category] || bot.category}
            </Badge>
            <StarRating rating={bot.rating} />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Download className="h-4 w-4" />
              {bot.installCount.toLocaleString()} установок
            </div>
          </div>

          <div className="pb-4">
            <h3 className="mb-1 text-sm font-semibold">Описание</h3>
            <p className="text-sm text-muted-foreground">
              {bot.longDescription || bot.description || "Нет описания"}
            </p>
          </div>

          <div className="pb-4">
            <h3 className="mb-1 text-sm font-semibold">Разработчик</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {bot.creator.displayName}
              </span>
              <span className="text-xs text-muted-foreground/60">
                @{bot.creator.username}
              </span>
            </div>
          </div>

          {screenshots.length > 0 && (
            <div className="pb-4">
              <h3 className="mb-2 text-sm font-semibold">Скриншоты</h3>
              <div className="relative flex items-center">
                {screenshots.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setScreenshotIdx((i) =>
                        i === 0 ? screenshots.length - 1 : i - 1,
                      )
                    }
                    className="absolute left-0 z-10 rounded-full bg-background/80 p-1 hover:bg-background"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="mx-auto overflow-hidden rounded-lg border border-border">
                  <img
                    src={screenshots[screenshotIdx]}
                    alt={`Скриншот ${screenshotIdx + 1}`}
                    className="h-48 w-auto object-contain"
                  />
                </div>
                {screenshots.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setScreenshotIdx((i) =>
                        i === screenshots.length - 1 ? 0 : i + 1,
                      )
                    }
                    className="absolute right-0 z-10 rounded-full bg-background/80 p-1 hover:bg-background"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
              {screenshots.length > 1 && (
                <div className="mt-2 flex justify-center gap-1">
                  {screenshots.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setScreenshotIdx(i)}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        i === screenshotIdx
                          ? "bg-primary"
                          : "bg-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          {installed ? (
            <a
              href={`/chat?botId=${bot.id}`}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Открыть
            </a>
          ) : (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {installing ? "Установка..." : "Установить"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
