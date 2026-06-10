"use client";

import * as React from "react";
import {
  X,
  Search,
  FolderOpen,
  Plus,
  MessageSquare,
  Hash,
  Link,
  File,
  User,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookmarkFolder {
  id: string;
  name: string;
  icon?: string | null;
  _count?: { bookmarks: number };
}

interface BookmarkItem {
  id: string;
  type: string;
  targetId: string;
  title?: string | null;
  note?: string | null;
  createdAt: string;
  folder?: { id: string; name: string; icon?: string | null } | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  message: <MessageSquare className="h-4 w-4" />,
  channel: <Hash className="h-4 w-4" />,
  link: <Link className="h-4 w-4" />,
  file: <File className="h-4 w-4" />,
  profile: <User className="h-4 w-4" />,
};

const defaultFolders = [
  { name: "Разработка", icon: "💻" },
  { name: "Работа", icon: "💼" },
  { name: "Учёба", icon: "📚" },
  { name: "Личное", icon: "🏠" },
];

interface BookmarksModalProps {
  open: boolean;
  onClose: () => void;
}

export function BookmarksModal({ open, onClose }: BookmarksModalProps) {
  const [folders, setFolders] = React.useState<BookmarkFolder[]>([]);
  const [bookmarks, setBookmarks] = React.useState<BookmarkItem[]>([]);
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch("/api/bookmarks/folders").then((r) => r.json()),
      fetch("/api/bookmarks").then((r) => r.json()),
    ])
      .then(([folderData, bookmarkData]) => {
        setFolders(folderData.folders ?? []);
        setBookmarks(bookmarkData.bookmarks ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = bookmarks.filter((b) => {
    if (selectedFolder && b.folder?.id !== selectedFolder) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.title?.toLowerCase().includes(q) ||
        b.note?.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-full max-w-4xl rounded-2xl bg-background shadow-2xl">
        {/* Folder Sidebar */}
        <aside className="w-56 border-r border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Закладки</h2>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setSelectedFolder(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                !selectedFolder ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Все
            </button>
          </div>
          <nav className="space-y-1">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolder(f.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  selectedFolder === f.id ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <span>{f.icon ?? "📁"}</span>
                <span className="flex-1 text-left truncate">{f.name}</span>
                {f._count && (
                  <span className="text-xs text-muted-foreground">{f._count.bookmarks}</span>
                )}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-accent/60"
          >
            <Plus className="h-4 w-4" />
            Новая папка
          </button>
        </aside>

        {/* Bookmark List */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск закладок..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {search ? "Ничего не найдено" : "Нет закладок"}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {typeIcons[b.type] ?? <Link className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.title ?? b.targetId}</div>
                    {b.note && (
                      <div className="truncate text-xs text-muted-foreground">{b.note}</div>
                    )}
                  </div>
                  {b.folder && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                      {b.folder.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
