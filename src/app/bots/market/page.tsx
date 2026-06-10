"use client";

import * as React from "react";
import {
  Search,
  Star,
  Download,
  Bot,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BotDetailModal } from "@/components/bots/bot-detail-modal";

interface MarketBot {
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

const CATEGORIES = [
  { key: "all", label: "Все" },
  { key: "support", label: "Поддержка" },
  { key: "sales", label: "Продажи" },
  { key: "games", label: "Игры" },
  { key: "ai", label: "AI" },
  { key: "automation", label: "Автоматизация" },
  { key: "music", label: "Музыка" },
  { key: "news", label: "Новости" },
];

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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

export default function BotMarketPage() {
  const [bots, setBots] = React.useState<MarketBot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"rating" | "installs">("rating");
  const [selectedBot, setSelectedBot] = React.useState<MarketBot | null>(null);

  const fetchBots = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      params.set("sort", sortBy);
      const res = await fetch(`/api/bots/market?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [category, search, sortBy]);

  React.useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Магазин ботов</h1>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск ботов..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSortBy("rating")}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              sortBy === "rating"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            По рейтингу
          </button>
          <button
            type="button"
            onClick={() => setSortBy("installs")}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              sortBy === "installs"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            По установкам
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setCategory(cat.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              category === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Bot cards */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Загрузка...</div>
      ) : bots.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          Боты не найдены
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <button
              key={bot.id}
              type="button"
              onClick={() => setSelectedBot(bot)}
              className="flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
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
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{bot.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{bot.username}
                  </div>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {bot.description || "Нет описания"}
              </p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {CATEGORY_MAP[bot.category] || bot.category}
                  </Badge>
                  <StarRating rating={bot.rating} />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Download className="h-3 w-3" />
                  {bot.installCount}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedBot && (
        <BotDetailModal
          bot={selectedBot}
          onClose={() => setSelectedBot(null)}
          onInstalled={fetchBots}
        />
      )}
    </div>
  );
}
