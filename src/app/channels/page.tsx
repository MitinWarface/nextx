"use client";

import * as React from "react";
import { Search, Users, Megaphone, ExternalLink, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: string | null;
  isVerified: boolean;
  isPaid: boolean;
  price: number | null;
  level: number;
  subscriberCount: number;
  messageCount: number;
  lastPostAt: string;
  createdAt: string;
}

const CATEGORIES = [
  { key: "", label: "Все" },
  { key: "tech", label: "Технологии" },
  { key: "news", label: "Новости" },
  { key: "gaming", label: "Игры" },
  { key: "music", label: "Музыка" },
  { key: "education", label: "Образование" },
  { key: "crypto", label: "Криптовалюта" },
  { key: "art", label: "Искусство" },
  { key: "sport", label: "Спорт" },
  { key: "other", label: "Другое" },
];

export default function ChannelsPage() {
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [subscribing, setSubscribing] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category) params.set("category", category);
      const res = await fetch(`/api/channels?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  React.useEffect(() => { load(); }, [load]);

  const handleSubscribe = async (channelId: string) => {
    setSubscribing(channelId);
    try {
      const res = await fetch(`/api/channels/${channelId}/subscribe`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        load();
      }
    } finally {
      setSubscribing(null);
    }
  };

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Megaphone className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Каталог каналов</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск каналов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === cat.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Загрузка...</div>
        ) : channels.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Каналы не найдены</div>
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-accent/30"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {ch.avatarUrl ? (
                    <img src={ch.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    ch.name?.charAt(0) ?? "#"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">{ch.name}</span>
                    {ch.isVerified && <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />}
                    {ch.isPaid && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                  </div>
                  {ch.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{ch.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {formatCount(ch.subscriberCount)}
                    </span>
                    <span>{formatCount(ch.messageCount)} постов</span>
                    {ch.isPaid && ch.price && (
                      <span className="text-amber-500">{ch.price} NC/мес</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubscribe(ch.id)}
                  disabled={subscribing === ch.id}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {subscribing === ch.id ? "..." : "Подписаться"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
