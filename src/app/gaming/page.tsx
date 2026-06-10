"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2,
  Trophy,
  Users,
  Search,
  X,
  Plus,
  Star,
  MessageSquare,
  Crown,
  Clock,
  Target,
  Gamepad,
  Monitor,
  Smartphone,
  CircleDot,
} from "lucide-react";

type Tab = "leaderboard" | "tournaments" | "lfg";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  messages: number;
  voiceMin: number;
  gifts: number;
  weekXp: number;
}

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  game: string;
  maxPlayers: number;
  startTime: string;
  status: string;
  prizePool: number | null;
  createdAt: string;
  creator: { id: string; username: string; displayName: string; avatarUrl: string | null };
  participantCount: number;
}

interface LfgUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: string;
  gamingProfile: {
    gameUsername: string | null;
    platform: string | null;
    games: string[];
    rank: string | null;
  };
}

interface GamingProfile {
  id: string;
  gameUsername: string | null;
  platform: string | null;
  games: string[];
  rank: string | null;
  lfg: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  pc: "ПК",
  ps: "PlayStation",
  xbox: "Xbox",
  mobile: "Мобильная",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-500/15 text-blue-400",
  active: "bg-green-500/15 text-green-400",
  completed: "bg-muted text-muted-foreground",
};

function formatPrize(n: number | null) {
  if (!n) return null;
  return `${(n / 100).toFixed(0)} NC`;
}

function formatVoice(minutes: number) {
  if (minutes < 60) return `${minutes}м`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}ч ${m}м` : `${h}ч`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}м назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  return `${days}д назад`;
}

export default function GamingPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("leaderboard");
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [lfgUsers, setLfgUsers] = React.useState<LfgUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<GamingProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showCreateTournament, setShowCreateTournament] = React.useState(false);
  const [gameFilter, setGameFilter] = React.useState("");

  React.useEffect(() => {
    if (userLoading) return;
    if (!user) { router.push("/login"); return; }
  }, [user, userLoading, router]);

  const fetchProfile = React.useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/users/me/gaming", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile ?? null);
      }
    } catch { /* ignore */ }
  }, [user]);

  const fetchLeaderboard = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gaming/leaderboard?limit=50", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  const fetchTournaments = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (gameFilter) params.set("game", gameFilter);
      const res = await fetch(`/api/gaming/tournaments?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTournaments(data.tournaments ?? []);
      }
    } finally { setLoading(false); }
  }, [gameFilter]);

  const fetchLfg = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gaming/leaderboard?limit=100", { credentials: "include" });
      // For LFG we reuse users with gaming profiles
      // In a real app there'd be a dedicated endpoint
      setLfgUsers([]);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { fetchProfile(); }, [fetchProfile]);
  React.useEffect(() => {
    if (tab === "leaderboard") fetchLeaderboard();
    else if (tab === "tournaments") fetchTournaments();
    else fetchLfg();
  }, [tab, fetchLeaderboard, fetchTournaments, fetchLfg]);

  const handleJoinTournament = async (tournamentId: string) => {
    try {
      const res = await fetch(`/api/gaming/tournaments/${tournamentId}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        fetchTournaments();
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка");
      }
    } catch { /* ignore */ }
  };

  if (userLoading || !user) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Gamepad2 className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Игровое сообщество</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Gamepad className="h-4 w-4" /> Профиль
          </button>
          <button onClick={() => router.back()} className="rounded-md p-1.5 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("leaderboard")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors",
            tab === "leaderboard" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Trophy className="mr-1 inline h-4 w-4" /> Лидерборды
        </button>
        <button
          onClick={() => setTab("tournaments")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors",
            tab === "tournaments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Target className="mr-1 inline h-4 w-4" /> Турниры
        </button>
        <button
          onClick={() => setTab("lfg")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors",
            tab === "lfg" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="mr-1 inline h-4 w-4" /> LFG
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Загрузка...</div>
        ) : (
          <>
            {/* Leaderboard Tab */}
            {tab === "leaderboard" && (
              <div className="p-4">
                {leaderboard.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    <Trophy className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>Пока нет данных</p>
                    <p className="text-xs mt-1">Участвуйте в чатах, чтобы попасть в таблицу</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                          <th className="px-3 py-2 w-10">#</th>
                          <th className="px-3 py-2">Игрок</th>
                          <th className="px-3 py-2 text-right">XP</th>
                          <th className="px-3 py-2 text-right hidden sm:table-cell">Сообщ.</th>
                          <th className="px-3 py-2 text-right hidden sm:table-cell">Голос</th>
                          <th className="px-3 py-2 text-right hidden sm:table-cell">Подарки</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((e) => (
                          <tr key={e.userId} className="border-b border-border last:border-0 hover:bg-accent/30">
                            <td className="px-3 py-2 font-medium">
                              {e.rank <= 3 ? (
                                <span className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                  e.rank === 1 && "bg-yellow-500/20 text-yellow-500",
                                  e.rank === 2 && "bg-gray-400/20 text-gray-400",
                                  e.rank === 3 && "bg-orange-500/20 text-orange-500",
                                )}>
                                  {e.rank}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{e.rank}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                                  {e.avatarUrl ? (
                                    <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                                      {(e.displayName ?? e.username ?? "?")[0].toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{e.displayName}</div>
                                  {e.username && <div className="truncate text-xs text-muted-foreground">@{e.username}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-primary">{e.xp.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">{e.messages.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">{formatVoice(e.voiceMin)}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">{e.gifts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tournaments Tab */}
            {tab === "tournaments" && (
              <div className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={gameFilter}
                      onChange={(e) => setGameFilter(e.target.value)}
                      placeholder="Поиск по игре..."
                      className="w-full rounded-md border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={() => setShowCreateTournament(true)}
                    className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110"
                  >
                    <Plus className="h-4 w-4" /> Создать
                  </button>
                </div>

                {tournaments.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    <Target className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>Нет турниров</p>
                    <p className="text-xs mt-1">Создайте первый турнир!</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tournaments.map((t) => (
                      <div key={t.id} className="rounded-lg border border-border p-3 hover:bg-accent/30">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="font-medium leading-tight">{t.title}</h3>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLORS[t.status] ?? STATUS_COLORS.upcoming)}>
                            {t.status === "upcoming" ? "Скоро" : t.status === "active" ? "Активен" : "Завершён"}
                          </span>
                        </div>
                        <div className="mb-2 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Gamepad2 className="h-3.5 w-3.5" /> {t.game}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(t.startTime).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" /> {t.participantCount}/{t.maxPlayers} игроков
                          </div>
                          {t.prizePool && (
                            <div className="flex items-center gap-1.5">
                              <Crown className="h-3.5 w-3.5 text-yellow-500" /> {formatPrize(t.prizePool)}
                            </div>
                          )}
                        </div>
                        {t.description && (
                          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">от {t.creator.displayName}</span>
                          {t.status === "upcoming" && t.participantCount < t.maxPlayers && (
                            <button
                              onClick={() => handleJoinTournament(t.id)}
                              className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:brightness-110"
                            >
                              Вступить
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LFG Tab */}
            {tab === "lfg" && (
              <div className="p-4">
                {lfgUsers.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>Нет игроков в поиске</p>
                    <p className="text-xs mt-1">Включите LFG в игровом профиле</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lfgUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/30">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                              {(u.displayName ?? u.username ?? "?")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{u.displayName}</span>
                            {u.gamingProfile.rank && (
                              <Badge variant="outline" className="text-[10px]">{u.gamingProfile.rank}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                            {u.gamingProfile.platform && (
                              <span>{PLATFORM_LABELS[u.gamingProfile.platform] ?? u.gamingProfile.platform}</span>
                            )}
                            {u.gamingProfile.games.length > 0 && (
                              <span>· {u.gamingProfile.games.slice(0, 3).join(", ")}{u.gamingProfile.games.length > 3 ? ` +${u.gamingProfile.games.length - 3}` : ""}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/?chat=${u.id}`)}
                          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Написать
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Gaming Profile Modal */}
      {showProfileModal && (
        <GamingProfileModal
          profile={profile}
          onClose={() => setShowProfileModal(false)}
          onSave={(p) => { setProfile(p); setShowProfileModal(false); }}
        />
      )}

      {/* Create Tournament Modal */}
      {showCreateTournament && (
        <CreateTournamentModal
          onClose={() => setShowCreateTournament(false)}
          onCreate={() => { setShowCreateTournament(false); fetchTournaments(); }}
        />
      )}
    </div>
  );
}

function GamingProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: GamingProfile | null;
  onClose: () => void;
  onSave: (p: GamingProfile) => void;
}) {
  const [gameUsername, setGameUsername] = React.useState(profile?.gameUsername ?? "");
  const [platform, setPlatform] = React.useState<string>(profile?.platform ?? "pc");
  const [games, setGames] = React.useState<string[]>(profile?.games ?? []);
  const [gameInput, setGameInput] = React.useState("");
  const [rank, setRank] = React.useState(profile?.rank ?? "");
  const [lfg, setLfg] = React.useState(profile?.lfg ?? false);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/gaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gameUsername: gameUsername || null,
          platform,
          games,
          rank: rank || null,
          lfg,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSave(data.profile);
      }
    } finally { setSaving(false); }
  };

  const addGame = () => {
    const g = gameInput.trim();
    if (g && !games.includes(g) && games.length < 20) {
      setGames([...games, g]);
      setGameInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Игровой профиль</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Игровой никнейм</label>
            <input
              value={gameUsername}
              onChange={(e) => setGameUsername(e.target.value)}
              placeholder="Ваш ник в игре"
              className="w-full rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Платформа</label>
            <div className="flex gap-1.5">
              {(["pc", "ps", "xbox", "mobile"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    platform === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {p === "pc" && <Monitor className="h-3.5 w-3.5" />}
                  {p === "ps" && <CircleDot className="h-3.5 w-3.5" />}
                  {p === "xbox" && <Gamepad2 className="h-3.5 w-3.5" />}
                  {p === "mobile" && <Smartphone className="h-3.5 w-3.5" />}
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Любимые игры</label>
            <div className="flex gap-1.5">
              <input
                value={gameInput}
                onChange={(e) => setGameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGame(); } }}
                placeholder="Добавить игру..."
                className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={addGame} className="rounded-md border border-border px-2 py-1.5 hover:bg-accent">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {games.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {games.map((g) => (
                  <span key={g} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {g}
                    <button onClick={() => setGames(games.filter((x) => x !== g))} className="hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Ранг</label>
            <input
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="Напр. Diamond, Global Elite..."
              className="w-full rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={lfg}
              onChange={(e) => setLfg(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span>Ищу группу (LFG)</span>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateTournamentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [game, setGame] = React.useState("");
  const [maxPlayers, setMaxPlayers] = React.useState("16");
  const [startTime, setStartTime] = React.useState("");
  const [prizePool, setPrizePool] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleCreate = async () => {
    if (!title || !game || !startTime) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gaming/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description: description || undefined,
          game,
          maxPlayers: parseInt(maxPlayers) || 16,
          startTime: new Date(startTime).toISOString(),
          prizePool: prizePool ? parseInt(prizePool) * 100 : undefined,
        }),
      });
      if (res.ok) onCreate();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Новый турнир</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Название</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Турнир по Dota 2"
              className="w-full rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Правила, формат..."
              rows={2}
              className="w-full rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Игра</label>
              <input
                value={game}
                onChange={(e) => setGame(e.target.value)}
                placeholder="Dota 2"
                className="w-full rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Макс. игроков</label>
              <input
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                min={2}
                max={256}
                className="w-full rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Дата и время</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Призовой фонд (NC)</label>
              <input
                type="number"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="0"
                min={0}
                className="w-full rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !title || !game || !startTime}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Создание..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
