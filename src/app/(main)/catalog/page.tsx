"use client";

import * as React from "react";
import {
  Search,
  Compass,
  Hash,
  Users,
  Bot,
  Package,
  User,
  Star,
  BadgeCheck,
  Crown,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "all" | "channels" | "groups" | "bots" | "apps" | "users";

interface CatalogChannel {
  id: string;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isPaid: boolean;
  price: number | null;
  category: string | null;
  level: number;
  subscriberCount: number;
  type: "channels";
}

interface CatalogGroup {
  id: string;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  category: string | null;
  level: number;
  memberCount: number;
  type: "groups";
}

interface CatalogBot {
  id: string;
  name: string;
  username: string | null;
  description: string | null;
  avatarUrl: string | null;
  creator: { id: string; displayName: string; username: string };
  type: "bots";
}

interface CatalogApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  rating: number;
  installs: number;
  version: string | null;
  developer: string;
  type: "apps";
}

interface CatalogUser {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string | null;
  isPremium: boolean;
  type: "users";
}

interface CatalogResponse {
  channels: CatalogChannel[];
  groups: CatalogGroup[];
  bots: CatalogBot[];
  apps: CatalogApp[];
  users: CatalogUser[];
  counts: Record<TabKey, number>;
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Compass className="h-4 w-4" /> },
  { key: "channels", label: "Channels", icon: <Hash className="h-4 w-4" /> },
  { key: "groups", label: "Groups", icon: <Users className="h-4 w-4" /> },
  { key: "bots", label: "Bots", icon: <Bot className="h-4 w-4" /> },
  { key: "apps", label: "Apps", icon: <Package className="h-4 w-4" /> },
  { key: "users", label: "People", icon: <User className="h-4 w-4" /> },
];

function getHref(item: CatalogChannel | CatalogGroup | CatalogBot | CatalogApp | CatalogUser): string {
  switch (item.type) {
    case "channels":
    case "groups":
      return `/?chat=${item.id}`;
    case "bots":
      return `/u/${(item as CatalogBot).username ?? item.id}`;
    case "apps":
      return `/apps`;
    case "users":
      return `/u/${(item as CatalogUser).username ?? item.id}`;
    default:
      return "#";
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function InitialsAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-12 w-12 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
      {initials || "?"}
    </div>
  );
}

function ChannelCard({ ch }: { ch: CatalogChannel }) {
  return (
    <a
      href={getHref(ch)}
      className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
    >
      <InitialsAvatar name={ch.name ?? "Channel"} url={ch.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-sm">{ch.name}</span>
          {ch.isVerified && (
            <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" />
          )}
          {ch.isPaid && (
            <span className="shrink-0 rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-semibold text-amber-600">
              PRO
            </span>
          )}
        </div>
        {ch.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {ch.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatCount(ch.subscriberCount)} subscribers</span>
          <span>Level {ch.level}</span>
        </div>
      </div>
    </a>
  );
}

function GroupCard({ g }: { g: CatalogGroup }) {
  return (
    <a
      href={getHref(g)}
      className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
    >
      <InitialsAvatar name={g.name ?? "Group"} url={g.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-sm">{g.name}</span>
        </div>
        {g.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {g.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatCount(g.memberCount)} members</span>
          <span>Level {g.level}</span>
        </div>
      </div>
    </a>
  );
}

function BotCard({ b }: { b: CatalogBot }) {
  return (
    <a
      href={getHref(b)}
      className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
    >
      <InitialsAvatar name={b.name} url={b.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-sm">{b.name}</span>
          <span className="rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary">
            BOT
          </span>
        </div>
        {b.username && (
          <p className="text-xs text-muted-foreground">@{b.username}</p>
        )}
        {b.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {b.description}
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          by {b.creator.displayName}
        </p>
      </div>
    </a>
  );
}

function AppCard({ a }: { a: CatalogApp }) {
  return (
    <a
      href={getHref(a)}
      className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg">
        {a.icon ? (
          <img
            src={a.icon}
            alt={a.name}
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <Package className="h-6 w-6 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate font-medium text-sm">{a.name}</span>
        {a.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {a.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {a.category && <span className="capitalize">{a.category}</span>}
          {a.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {a.rating.toFixed(1)}
            </span>
          )}
          <span>{formatCount(a.installs)} installs</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          by {a.developer}
        </p>
      </div>
    </a>
  );
}

function UserCard({ u }: { u: CatalogUser }) {
  return (
    <a
      href={getHref(u)}
      className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
    >
      <InitialsAvatar name={u.displayName} url={u.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-sm">
            {u.displayName}
          </span>
          {u.role && u.role !== "USER" && (
            <span className="shrink-0 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary uppercase">
              {u.role}
            </span>
          )}
          {u.isPremium && (
            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          )}
        </div>
        {u.username && (
          <p className="text-xs text-muted-foreground">@{u.username}</p>
        )}
        {u.bio && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {u.bio}
          </p>
        )}
      </div>
    </a>
  );
}

export default function CatalogPage() {
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TabKey>("all");
  const [results, setResults] = React.useState<CatalogResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = React.useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      const res = await fetch(`/api/catalog?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = React.useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch],
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const totalCount = results
    ? Object.values(results.counts).reduce((a, b) => a + b, 0)
    : 0;

  const hasResults =
    results &&
    (results.channels.length +
      results.groups.length +
      results.bots.length +
      results.apps.length +
      results.users.length) >
      0;

  const renderSection = <T extends { type: string }>(
    label: string,
    items: T[],
    Card: React.FC<any>,
    cardKey: string,
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          {label} ({items.length})
        </h3>
        <div className="grid gap-2">
          {items.map((item: any) => (
            <Card key={item.id} {...{ [cardKey]: item }} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg p-1.5 hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Compass className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Catalog</h1>
      </header>

      {/* Search */}
      <div className="border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search channels, groups, bots, apps, people..."
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            autoFocus
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
        {TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? totalCount
              : results?.counts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
              {results && count > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    activeTab === tab.key
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Explore NextX</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Search for channels, groups, bots, mini-apps, and people all in one
              place.
            </p>
          </div>
        ) : loading && !results ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !hasResults ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(activeTab === "all" || activeTab === "channels") &&
              renderSection("Channels", results!.channels, ChannelCard, "ch")}
            {(activeTab === "all" || activeTab === "groups") &&
              renderSection("Groups", results!.groups, GroupCard, "g")}
            {(activeTab === "all" || activeTab === "bots") &&
              renderSection("Bots", results!.bots, BotCard, "b")}
            {(activeTab === "all" || activeTab === "apps") &&
              renderSection("Mini Apps", results!.apps, AppCard, "a")}
            {(activeTab === "all" || activeTab === "users") &&
              renderSection("People", results!.users, UserCard, "u")}
          </div>
        )}
      </div>
    </div>
  );
}
