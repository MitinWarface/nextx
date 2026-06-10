"use client";

import * as React from "react";
import { X, Plus, Tag, Palette } from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

interface ContactTagItem {
  id: string;
  name: string;
  color: string | null;
  _count?: { mappings: number };
}

interface ContactTagsProps {
  targetId: string;
  onTagsChanged?: () => void;
}

const PRESET_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#22C55E",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#6366F1",
  "#14B8A6",
];

export function ContactTags({ targetId, onTagsChanged }: ContactTagsProps) {
  const [allTags, setAllTags] = React.useState<ContactTagItem[]>([]);
  const [targetTags, setTargetTags] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [showCreator, setShowCreator] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState(PRESET_COLORS[0]);
  const [creating, setCreating] = React.useState(false);

  const loadTags = React.useCallback(async () => {
    try {
      const [allRes, targetRes] = await Promise.all([
        fetch("/api/users/me/tags", { credentials: "include" }),
        fetch(`/api/users/me/tags?targetId=${targetId}`, { credentials: "include" }).catch(
          () => null,
        ),
      ]);

      if (allRes.ok) {
        const d = await allRes.json();
        setAllTags(d.tags ?? []);
      }

      if (targetRes && targetRes.ok) {
        const d = await targetRes.json();
        const tagIds = new Set<string>(
          (d.tags ?? []).map((t: ContactTagItem) => t.id),
        );
        setTargetTags(tagIds);
      }
    } catch {}
  }, [targetId]);

  React.useEffect(() => {
    loadTags();
  }, [loadTags]);

  const fetchTargetTagIds = React.useCallback(async () => {
    try {
      const res = await fetch("/api/users/me/tags", { credentials: "include" });
      if (!res.ok) return;
      const d = await res.json();
      const tags: ContactTagItem[] = d.tags ?? [];

      const results = await Promise.all(
        tags.map(async (tag) => {
          try {
            const r = await fetch(
              `/api/users/me/tags/${tag.id}/contacts`,
              { credentials: "include" },
            );
            if (!r.ok) return { tagId: tag.id, has: false };
            const dd = await r.json();
            const has = (dd.contacts ?? []).some(
              (c: { id: string }) => c.id === targetId,
            );
            return { tagId: tag.id, has };
          } catch {
            return { tagId: tag.id, has: false };
          }
        }),
      );

      const ids = new Set<string>();
      results.forEach((r) => {
        if (r.has) ids.add(r.tagId);
      });
      setTargetTags(ids);
    } catch {}
  }, [targetId]);

  React.useEffect(() => {
    fetchTargetTagIds();
  }, [fetchTargetTagIds]);

  const toggleTag = async (tagId: string) => {
    setLoading(true);
    try {
      const isTagged = targetTags.has(tagId);
      const method = isTagged ? "DELETE" : "POST";
      const res = await fetch(`/api/users/me/tags/${tagId}/contacts`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetId }),
      });

      if (res.ok || res.status === 204) {
        setTargetTags((prev) => {
          const next = new Set(prev);
          if (isTagged) next.delete(tagId);
          else next.add(tagId);
          return next;
        });
        toast.success(isTagged ? "Тег снят" : "Тег добавлен");
        onTagsChanged?.();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/users/me/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });

      if (res.ok) {
        const d = await res.json();
        setAllTags((prev) => [...prev, d.tag]);
        setTargetTags((prev) => new Set([...prev, d.tag.id]));
        setNewName("");
        setShowCreator(false);
        toast.success("Тег создан и добавлен");
        onTagsChanged?.();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const active = targetTags.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              disabled={loading}
              onClick={() => toggleTag(tag.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                active
                  ? "text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              style={
                active
                  ? { backgroundColor: tag.color ?? "#3B82F6" }
                  : undefined
              }
            >
              <Tag className="h-3 w-3" />
              {tag.name}
              {tag._count && (
                <span className="ml-0.5 opacity-70">
                  {tag._count.mappings}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowCreator(!showCreator)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent/50"
        >
          <Plus className="h-3 w-3" />
          Тег
        </button>
      </div>

      {showCreator && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Название тега..."
            className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
            autoFocus
          />
          <div className="flex items-center gap-1">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-transform",
                  newColor === c
                    ? "border-foreground scale-110"
                    : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "..." : "Создать и добавить"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreator(false);
                setNewName("");
              }}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
