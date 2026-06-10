"use client";

import * as React from "react";
import { Sparkles, Gift, Award, Frame, Users, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeasonalEvent {
  id: string;
  code: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  theme?: { colors?: string[]; icon?: string; background?: string } | null;
  rewards?: { frames?: string[]; badges?: string[]; gifts?: string[] } | null;
  participants: number;
}

export default function SeasonalPage() {
  const [event, setEvent] = React.useState<SeasonalEvent | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [claiming, setClaiming] = React.useState(false);
  const [claimed, setClaimed] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/seasonal")
      .then((r) => r.json())
      .then((data) => setEvent(data.event))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async () => {
    if (!event) return;
    setJoining(true);
    try {
      await fetch(`/api/seasonal/${event.id}/join`, { method: "POST", credentials: "include" });
      setEvent((prev) => prev ? { ...prev, participants: prev.participants + 1 } : prev);
    } catch (e) {
      console.error(e);
    } finally {
      setJoining(false);
    }
  };

  const handleClaim = async () => {
    if (!event) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/seasonal/${event.id}/claim`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.claimed) setClaimed(true);
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Нет активных событий</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const isActive = now >= new Date(event.startsAt) && now <= new Date(event.endsAt);
  const isEnded = now > new Date(event.endsAt);
  const rewards = event.rewards ?? { frames: [], badges: [], gifts: [] };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8">
          <div className="flex items-center gap-4">
            <Sparkles className="h-12 w-12 text-purple-500" />
            <div>
              <h1 className="text-3xl font-bold">{event.name}</h1>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {event.participants} участников
            </div>
            <div>
              {new Date(event.startsAt).toLocaleDateString("ru-RU")} — {new Date(event.endsAt).toLocaleDateString("ru-RU")}
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                isActive ? "bg-green-500/10 text-green-500" : isEnded ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500",
              )}
            >
              {isActive ? "Активно" : isEnded ? "Завершено" : "Скоро"}
            </span>
          </div>
        </div>

        {/* Rewards */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Награды</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Frames */}
            {rewards.frames && rewards.frames.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Frame className="h-5 w-5 text-cyan-500" />
                  <h3 className="font-medium">Рамки</h3>
                </div>
                <ul className="space-y-2">
                  {rewards.frames.map((frame) => (
                    <li key={frame} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      {frame}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Badges */}
            {rewards.badges && rewards.badges.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  <h3 className="font-medium">Бейджи</h3>
                </div>
                <ul className="space-y-2">
                  {rewards.badges.map((badge) => (
                    <li key={badge} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      {badge}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gifts */}
            {rewards.gifts && rewards.gifts.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-pink-500" />
                  <h3 className="font-medium">Подарки</h3>
                </div>
                <ul className="space-y-2">
                  {rewards.gifts.map((gift) => (
                    <li key={gift} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      {gift}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {isActive && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {joining ? "Присоединяемся..." : "Присоединиться"}
            </button>
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming || claimed}
              className={cn(
                "rounded-xl border border-border px-6 py-3 font-medium transition-colors",
                claimed ? "bg-green-500/10 text-green-500" : "hover:bg-accent/60",
              )}
            >
              {claimed ? "Получено!" : claiming ? "Получаем..." : "Получить награды"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
