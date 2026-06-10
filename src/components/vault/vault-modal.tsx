"use client";

import * as React from "react";
import {
  X,
  Search,
  Plus,
  Star,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  Lock,
  Shield,
  FileText,
  CreditCard,
  Key,
  StickyNote,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface VaultItem {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  folder: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VaultModalProps {
  open: boolean;
  onClose: () => void;
}

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  default: <FolderOpen className="h-4 w-4" />,
  passwords: <Key className="h-4 w-4" />,
  documents: <FileText className="h-4 w-4" />,
  seed_phrases: <Hash className="h-4 w-4" />,
  cards: <CreditCard className="h-4 w-4" />,
  notes: <StickyNote className="h-4 w-4" />,
};

const FOLDER_LABELS: Record<string, string> = {
  default: "\u0412\u0441\u0435",
  passwords: "\u041F\u0430\u0440\u043E\u043B\u0438",
  documents: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B",
  seed_phrases: "Seed-\u0444\u0440\u0430\u0437\u044B",
  cards: "\u041A\u0430\u0440\u0442\u044B",
  notes: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  password: <Key className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  seed_phrase: <Hash className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
};

export function VaultModal({ open, onClose }: VaultModalProps) {
  const [unlocked, setUnlocked] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [pinLoading, setPinLoading] = React.useState(false);
  const [items, setItems] = React.useState<VaultItem[]>([]);
  const [folders, setFolders] = React.useState<{ name: string; count: number }[]>([]);
  const [activeFolder, setActiveFolder] = React.useState("default");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<VaultItem | null>(null);
  const [revealedIds, setRevealedIds] = React.useState<Set<string>>(new Set());

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFolder !== "default") params.set("folder", activeFolder);
      if (query) params.set("q", query);
      const res = await fetch(`/api/vault?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [activeFolder, query]);

  const loadFolders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/vault/folders", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  React.useEffect(() => {
    if (unlocked) {
      loadItems();
      loadFolders();
    }
  }, [unlocked, loadItems, loadFolders]);

  const handleUnlock = async () => {
    if (!pin || pin.length < 4) return;
    setPinLoading(true);
    try {
      const res = await fetch("/api/vault/unlock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok && data.unlocked) {
        setUnlocked(true);
        setPin("");
      } else {
        toast.error(data.error === "invalid_pin" ? "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 PIN" : "\u041E\u0448\u0438\u0431\u043A\u0430");
      }
    } catch {
      toast.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438");
    } finally {
      setPinLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442?")) return;
    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("\u0423\u0434\u0430\u043B\u0435\u043D\u043E");
        loadItems();
        loadFolders();
      }
    } catch {
      toast.error("\u041E\u0448\u0438\u0431\u043A\u0430");
    }
  };

  const handleToggleFav = async (item: VaultItem) => {
    try {
      await fetch(`/api/vault/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      loadItems();
    } catch { /* ignore */ }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E");
  };

  if (!open) return null;

  // PIN entry screen
  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50" onClick={onClose}>
        <div
          className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Vault</h2>
            <p className="text-center text-sm text-muted-foreground">
              \u0412\u0432\u0435\u0434\u0438\u0442\u0435 PIN \u0434\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0443
            </p>
            <Lock className="h-5 w-5 text-muted-foreground" />
            <input
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              maxLength={8}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-center text-lg tracking-[0.5em]"
              autoFocus
            />
            <button
              type="button"
              onClick={handleUnlock}
              disabled={pinLoading || pin.length < 4}
              className="w-full rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {pinLoading ? "\u041F\u043E\u0432\u0435\u0440\u043A\u0430..." : "\u041E\u0442\u043A\u0440\u044B\u0442\u044C"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 flex h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Vault</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="\u041F\u043E\u0438\u0441\u043A..."
                className="h-8 w-48 rounded-md border border-input bg-transparent pl-8 pr-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => { setEditItem(null); setAddOpen(true); }}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C
            </button>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-accent">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 shrink-0 border-r border-border p-2">
            {Object.entries(FOLDER_LABELS).map(([key, label]) => {
              const count = key === "default"
                ? items.length
                : folders.find((f) => f.name === key)?.count ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFolder(key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    activeFolder === key ? "bg-primary/10 text-primary" : "hover:bg-accent",
                  )}
                >
                  {FOLDER_ICONS[key] ?? <FolderOpen className="h-4 w-4" />}
                  <span className="flex-1 truncate">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">\u041F\u0443\u0441\u0442\u043E</div>
            ) : (
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {TYPE_ICONS[item.type] ?? <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{item.title}</span>
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {item.type}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="truncate max-w-[200px]">
                          {revealedIds.has(item.id) ? item.content : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleReveal(item.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          {revealedIds.has(item.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyContent(item.content)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleToggleFav(item)}
                        className={cn("rounded p-1 hover:bg-accent", item.isFavorite && "text-amber-500")}
                      >
                        <Star className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditItem(item); setAddOpen(true); }}
                        className="rounded p-1 hover:bg-accent text-muted-foreground"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded p-1 hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit modal */}
      {addOpen && (
        <VaultItemForm
          item={editItem}
          onClose={() => { setAddOpen(false); setEditItem(null); }}
          onSaved={() => { setAddOpen(false); setEditItem(null); loadItems(); loadFolders(); }}
        />
      )}
    </div>
  );
}

function VaultItemForm({
  item,
  onClose,
  onSaved,
}: {
  item: VaultItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = React.useState(item?.type ?? "password");
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [content, setContent] = React.useState(item?.content ?? "");
  const [folder, setFolder] = React.useState(item?.folder ?? "default");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const url = item ? `/api/vault/${item.id}` : "/api/vault";
      const method = item ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), content: content.trim(), folder }),
      });
      if (res.ok) {
        toast.success(item ? "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E" : "\u0421\u043E\u0437\u0434\u0430\u043D\u043E");
        onSaved();
      } else {
        toast.error("\u041E\u0448\u0438\u0431\u043A\u0430");
      }
    } catch {
      toast.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-bold">{item ? "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C" : "\u041D\u043E\u0432\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442"}</h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">\u0422\u0438\u043F</label>
            <div className="flex flex-wrap gap-1.5">
              {["password", "note", "document", "seed_phrase", "card"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs transition-colors",
                    type === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="\u041D\u0430\u043F\u0440. Gmail \u0430\u043A\u043A\u0430\u0443\u043D\u0442"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">\u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === "seed_phrase" ? "word1 word2 word3 ..." : "\u041F\u0430\u0440\u043E\u043B\u044C \u0438\u043B\u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0430..."}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">\u041F\u0430\u043F\u043A\u0430</label>
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            \u041E\u0442\u043C\u0435\u043D\u0430
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435..." : "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"}
          </button>
        </div>
      </div>
    </div>
  );
}
