"use client";

import * as React from "react";
import {
  X,
  Search,
  FolderOpen,
  Plus,
  MessageSquare,
  ChevronRight,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageCollection {
  id: string;
  name: string;
  emoji?: string | null;
  _count?: { items: number };
  createdAt: string;
}

interface CollectionMessage {
  id: string;
  collectionId: string;
  messageId: string;
  chatId: string;
  addedAt: string;
  collection?: { id: string; name: string; emoji?: string | null };
}

interface CollectionsModalProps {
  open: boolean;
  onClose: () => void;
}

export function CollectionsModal({ open, onClose }: CollectionsModalProps) {
  const [collections, setCollections] = React.useState<MessageCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<CollectionMessage[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newEmoji, setNewEmoji] = React.useState("📁");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMessages, setLoadingMessages] = React.useState(false);

  // Fetch collections
  const fetchCollections = React.useCallback(async () => {
    try {
      const res = await fetch("/api/users/me/message-collections");
      const data = await res.json();
      setCollections(data.collections ?? []);
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    }
  }, []);

  // Fetch messages for selected collection
  const selectedCollectionRef = React.useRef(selectedCollection);
  selectedCollectionRef.current = selectedCollection;

  const fetchMessages = React.useCallback(
    async (collectionId: string, append = false) => {
      setLoadingMessages(true);
      try {
        const url = new URL(
          `/api/users/me/message-collections/${collectionId}/messages`,
          window.location.origin,
        );
        if (append && cursor) {
          url.searchParams.set("cursor", cursor);
        }

        const res = await fetch(url.toString());
        const data = await res.json();

        if (append) {
          setMessages((prev) => [...prev, ...(data.messages ?? [])]);
        } else {
          setMessages(data.messages ?? []);
        }
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [cursor],
  );

  // Initial fetch
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchCollections().finally(() => setLoading(false));
  }, [open, fetchCollections]);

  // Fetch messages when collection selected (use ref to avoid re-fetch on cursor change)
  const prevSelectedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!selectedCollection) {
      setMessages([]);
      setCursor(null);
      setHasMore(false);
      prevSelectedRef.current = null;
      return;
    }
    if (selectedCollection !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedCollection;
      fetchMessages(selectedCollection, false);
    }
  }, [selectedCollection, fetchMessages]);

  // Create collection
  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/users/me/message-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), emoji: newEmoji || undefined }),
      });
      if (res.ok) {
        setCreating(false);
        setNewName("");
        setNewEmoji("📁");
        await fetchCollections();
      }
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  };

  // Update collection
  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/users/me/message-collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchCollections();
      }
    } catch (err) {
      console.error("Failed to update collection:", err);
    }
  };

  // Delete collection
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users/me/message-collections/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedCollection === id) {
          setSelectedCollection(null);
        }
        await fetchCollections();
      }
    } catch (err) {
      console.error("Failed to delete collection:", err);
    }
  };

  // Remove message from collection
  const handleRemoveMessage = async (messageId: string) => {
    if (!selectedCollection) return;
    try {
      const res = await fetch(
        `/api/users/me/message-collections/${selectedCollection}/messages`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        },
      );
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.messageId !== messageId));
        await fetchCollections();
      }
    } catch (err) {
      console.error("Failed to remove message:", err);
    }
  };

  // Filter collections by search
  const filteredCollections = collections.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q);
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-full max-w-4xl rounded-2xl bg-background shadow-2xl">
        {/* Collection Sidebar */}
        <aside className="w-64 border-r border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Коллекции</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск коллекций..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* All collections button */}
          <button
            type="button"
            onClick={() => setSelectedCollection(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              !selectedCollection ? "bg-accent" : "hover:bg-accent/60",
            )}
          >
            <FolderOpen className="h-4 w-4" />
            <span className="flex-1 text-left">Все коллекции</span>
          </button>

          {/* Collection list */}
          <nav className="mt-2 space-y-1">
            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Загрузка...
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {search ? "Ничего не найдено" : "Нет коллекций"}
              </div>
            ) : (
              filteredCollections.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    selectedCollection === c.id ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  {editingId === c.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 bg-transparent outline-none border-b border-primary"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedCollection(c.id)}
                      className="flex flex-1 items-center gap-2"
                    >
                      <span>{c.emoji ?? "📁"}</span>
                      <span className="flex-1 text-left truncate">{c.name}</span>
                      {c._count && (
                        <span className="text-xs text-muted-foreground">
                          {c._count.items}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Actions */}
                  <div className="hidden group-hover:flex items-center gap-1">
                    {editingId === c.id ? (
                      <button
                        type="button"
                        onClick={() => handleUpdate(c.id)}
                        className="text-green-500 hover:text-green-600"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditName(c.name);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </nav>

          {/* Create new collection */}
          {creating ? (
            <div className="mt-3 space-y-2">
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
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-accent/60"
            >
              <Plus className="h-4 w-4" />
              Новая коллекция
            </button>
          )}
        </aside>

        {/* Messages List */}
        <main className="flex-1 overflow-y-auto p-4">
          {!selectedCollection ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FolderOpen className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>Выберите коллекцию или создайте новую</p>
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Нет сообщений в коллекции
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {messages.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent/40"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        Сообщение {item.messageId.slice(0, 8)}...
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Добавлено {new Date(item.addedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMessage(item.messageId)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => fetchMessages(selectedCollection, true)}
                  className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  Загрузить ещё
                </button>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}