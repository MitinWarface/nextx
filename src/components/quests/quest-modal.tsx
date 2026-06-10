"use client";

import * as React from "react";
import { X, Trophy, CheckCircle, Gift, Star, Zap } from "lucide-react";
import { toast } from "@/store/toast-store";

interface QuestData {
  id: string;
  title: string;
  description: string;
  type: string;
  requirement: string;
  targetCount: number;
  reward: number;
  icon: string | null;
  userQuests: { id: string; progress: number; completed: boolean; claimedAt: string | null }[];
}

interface QuestModalProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  daily: <Zap className="h-4 w-4 text-yellow-500" />,
  weekly: <Star className="h-4 w-4 text-purple-500" />,
  achievement: <Trophy className="h-4 w-4 text-orange-500" />,
};

export function QuestModal({ open, onClose }: QuestModalProps) {
  const [quests, setQuests] = React.useState<QuestData[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [claiming, setClaiming] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "daily" | "weekly" | "achievement">("all");

  const fetchQuests = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quests", { credentials: "include" });
      const data = await res.json();
      setQuests(data.quests ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  React.useEffect(() => { if (open) fetchQuests(); }, [open, fetchQuests]);

  const handleClaim = async (questId: string) => {
    setClaiming(questId);
    try {
      const res = await fetch(`/api/quests/${questId}/claim`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`+${data.reward} NC получено!`);
        fetchQuests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Ошибка");
      }
    } catch { toast.error("Ошибка сети"); } finally { setClaiming(null); }
  };

  const filtered = filter === "all" ? quests : quests.filter((q) => q.type === filter);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Trophy className="h-5 w-5" /> Квесты</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-2 border-b border-border px-4 py-2">
          {(["all", "daily", "weekly", "achievement"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {f === "all" ? "Все" : f === "daily" ? "Ежедневные" : f === "weekly" ? "Еженедельные" : "Достижения"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Нет квестов</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => {
                const uq = q.userQuests[0];
                const progress = uq?.progress ?? 0;
                const pct = Math.min(100, Math.round((progress / q.targetCount) * 100));
                const completed = uq?.completed ?? false;
                const claimed = uq?.claimedAt != null;

                return (
                  <div key={q.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{q.icon ?? "🎯"}</span>
                        <div>
                          <h3 className="font-medium">{q.title}</h3>
                          <p className="text-sm text-muted-foreground">{q.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {TYPE_ICONS[q.type]}
                        {q.type}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{progress}/{q.targetCount}</span>
                        <span className="flex items-center gap-1"><Gift className="h-3 w-3" />{q.reward} NC</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end">
                      {claimed ? (
                        <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle className="h-3 w-3" /> Получено</span>
                      ) : completed ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(q.id)}
                          disabled={claiming === q.id}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {claiming === q.id ? "..." : "Забрать награду"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{pct}% выполнено</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
