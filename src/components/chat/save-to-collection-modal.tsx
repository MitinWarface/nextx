"use client";

import * as React from "react";
import { X, FolderOpen, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageCollection {
  id: string;
  name: string;
  emoji?: string | null;
  _count?: { items: number };
}

interface SaveToCollectionModalProps {
  open: boolean;
  onClose: () => void;
  messageId: string;
  chatId: string;
  onSave?: () => void;
}

export function SaveToCollectionModal({
  open,
  onClose,
  messageId,
  chatId,
  onSave,
}: SaveToCollectionModalProps) {
  const [collections, setCollections] = React.useState<MessageCollection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newEmoji, setNewEmoji] = React.useState("📁");

  // Fetch collections
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/users/me/message-collections")
      .then((res) => res.json())
      .then((data) => {
        setCollections(data.collections ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setSelectedCollection(null);
      setCreating(false);
      setNewName("");
      setNewEmoji("📁");
    }
  }, [open]);

  // Save to collection
  const handleSave = async () => {
    if (!selectedCollection) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/users/me/message-collections/${selectedCollection}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, chatId }),
        },
      );
      if (res.ok) {
        onSave?.();
        onClose();
      }
    } catch (err) {
      console.error("Failed to save to collection:", err);
    } finally {
      setSaving(false);
    }
  };

  // Create new collection
  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/users/me/message-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), emoji: newEmoji || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollections((prev) => [data.collection, ...prev]);
        setSelectedCollection(data.collection.id);
        setCreating(false);
        setNewName("");
        setNewEmoji("📁");
      }
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Сохранить в коллекцию</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
          ) : (
            <>
              {/* Collection list */}
              <div className="mb-4 max-h-60 overflow-y-auto">
                {collections.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Нет коллекций. Создайте новую.
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {collections.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCollection(c.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            selectedCollection === c.id
                              ? "bg-accent"
                              : "hover:bg-accent/60",
                          )}
                        >
                          <span>{c.emoji ?? "📁"}</span>
                          <span className="flex-1 text-left truncate">{c.name}</span>
                          {c._count && (
                            <span className="text-xs text-muted-foreground">
                              {c._count.items}
                            </span>
                          )}
                          {selectedCollection === c.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Create new collection */}
              {creating ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Emoji"
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      className="w-16 rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-sm text-center outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Название"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") setCreating(false);
                      }}
                      className="flex-1 rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-sm outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleCreate}
                      className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      Создать
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-accent/60"
                >
                  <Plus className="h-4 w-4" />
                  Новая коллекция
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedCollection || saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}