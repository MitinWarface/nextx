"use client";

import * as React from "react";
import { toast } from "@/store/toast-store";

interface ReactionCount {
  emoji: string;
  count: number;
}

interface ReactionBarProps {
  targetUserId: string;
}

const REACTION_EMOJIS = ["❤️", "🔥", "⚡", "👍", "💯", "🎉"];

export function ReactionBar({ targetUserId }: ReactionBarProps) {
  const [reactions, setReactions] = React.useState<ReactionCount[]>([]);
  const [myReactions, setMyReactions] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  const loadReactions = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${targetUserId}/reactions`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setReactions(json.data?.reactions ?? json.reactions ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [targetUserId]);

  React.useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  const toggleReaction = async (emoji: string) => {
    try {
      const res = await fetch(`/api/users/${targetUserId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const json = await res.json();
        const removed = json.data?.removed ?? json.removed;
        setMyReactions((prev) => {
          const next = new Set(prev);
          if (removed) {
            next.delete(emoji);
          } else {
            next.add(emoji);
          }
          return next;
        });
        loadReactions();
      }
    } catch {
      toast.error("Failed to update reaction");
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center gap-1">
      {REACTION_EMOJIS.map((emoji) => {
        const reaction = reactions.find((r) => r.emoji === emoji);
        const isActive = myReactions.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggleReaction(emoji)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
              isActive
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            <span>{emoji}</span>
            {reaction && reaction.count > 0 && <span className="font-mono">{reaction.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
