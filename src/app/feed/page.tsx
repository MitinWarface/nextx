"use client";

import * as React from "react";
import { Flame, RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

interface FeedItem {
  id: string;
  type: string;
  content?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
  chat?: { id: string; name?: string | null; avatarUrl?: string | null; type: string } | null;
  sender: { id: string; username?: string | null; displayName: string; avatarUrl?: string | null };
  reactions?: { emoji: string; userId: string }[];
  reactionsCount: number;
}

const filterTabs = [
  { id: "all", label: "Все" },
  { id: "channels", label: "Каналы" },
  { id: "groups", label: "Группы" },
  { id: "contacts", label: "Контакты" },
] as const;

export default function FeedPage() {
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<string>("all");
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const fetchFeed = React.useCallback(
    async (append = false) => {
      const typeParam = filter === "all" ? "" : `&type=${filter}`;
      const cursorParam = cursor ? `&cursor=${cursor}` : "";
      try {
        const res = await fetch(`/api/feed?limit=30${typeParam}${cursorParam}`, { credentials: "include" });
        const data = await res.json();
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, cursor],
  );

  React.useEffect(() => {
    setLoading(true);
    setCursor(null);
    setItems([]);
    fetchFeed(false);
  }, [filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    setCursor(null);
    fetchFeed(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchFeed(true);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Загрузка ленты...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl min-h-screen bg-background p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="h-7 w-7 text-orange-500" />
          <h1 className="text-2xl font-bold">Лента</h1>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-full p-2 text-muted-foreground hover:bg-accent"
        >
          <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === tab.id ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed Items */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Лента пуста</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/20"
            >
              <div className="mb-3 flex items-center gap-3">
                <Avatar
                  name={item.sender.displayName}
                  src={item.sender.avatarUrl ?? null}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.sender.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.chat?.name ?? ""} • {new Date(item.createdAt).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                {item.type === "channel_post" && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-500">Канал</span>
                )}
                {item.type === "gift_notification" && (
                  <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-xs text-pink-500">Подарок</span>
                )}
              </div>
              {item.content && <p className="mb-2 text-sm">{item.content}</p>}
              {item.mediaUrl && (
                <img
                  src={item.mediaUrl}
                  alt=""
                  className="mb-2 max-h-60 rounded-lg object-cover"
                />
              )}
              {item.reactions && item.reactions.length > 0 && (
                <div className="flex gap-1">
                  {Object.entries(
                    item.reactions.reduce<Record<string, number>>((acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                      return acc;
                    }, {}),
                  ).map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs"
                    >
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              className="w-full rounded-xl border border-border py-3 text-sm text-muted-foreground hover:bg-accent/40"
            >
              Загрузить ещё
            </button>
          )}
        </div>
      )}
    </div>
  );
}
