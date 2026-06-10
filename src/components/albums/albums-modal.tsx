"use client";

import * as React from "react";
import { X, Plus, Share2, Trash2, Image as ImageIcon, Link } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlbumMedia {
  id: string;
  fileId: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

interface Album {
  id: string;
  name: string;
  description: string | null;
  shareToken: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  media: AlbumMedia[];
  _count: { media: number };
}

interface AlbumsModalProps {
  open: boolean;
  onClose: () => void;
}

export function AlbumsModal({ open, onClose }: AlbumsModalProps) {
  const [albums, setAlbums] = React.useState<Album[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedAlbum, setSelectedAlbum] = React.useState<Album | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [shareLink, setShareLink] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/albums", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleShare = async (album: Album) => {
    if (album.shareToken) {
      setShareLink(`${window.location.origin}/api/albums/share/${album.shareToken}`);
      return;
    }
    const res = await fetch(`/api/albums/${album.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ generateShareToken: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedAlbum(data.album);
      setShareLink(`${window.location.origin}/api/albums/share/${data.album.shareToken}`);
    }
  };

  if (!open) return null;

  if (shareLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShareLink(null)}>
        <div className="flex w-full max-w-sm flex-col rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="mb-2 text-sm font-semibold">Ссылка для доступа</h3>
          <input readOnly value={shareLink} className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm" onClick={(e) => (e.target as HTMLInputElement).select()} />
          <button onClick={() => { navigator.clipboard.writeText(shareLink); setShareLink(null); }} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110">
            Копировать и закрыть
          </button>
        </div>
      </div>
    );
  }

  if (selectedAlbum) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedAlbum(null)}>
        <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedAlbum(null)} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
              <h2 className="text-lg font-semibold">{selectedAlbum.name}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleShare(selectedAlbum)} className="rounded-md p-1.5 hover:bg-accent" title="Поделиться"><Share2 className="h-4 w-4" /></button>
            </div>
          </div>
          {selectedAlbum.description && <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">{selectedAlbum.description}</div>}
          <div className="flex-1 overflow-auto p-4">
            {selectedAlbum.media.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Нет медиа</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {selectedAlbum.media.map((m) => (
                  <div key={m.id} className="flex aspect-square items-center justify-center rounded-md border border-border bg-accent/30">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[70vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Альбомы</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowCreate(true)} className="rounded-md p-1.5 hover:bg-accent" title="Создать"><Plus className="h-4 w-4" /></button>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : albums.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет альбомов. Создайте первый!</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {albums.map((album) => (
                <button key={album.id} onClick={() => setSelectedAlbum(album)} className="flex flex-col items-center rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex h-20 w-full items-center justify-center rounded-md bg-accent/30 mb-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div className="text-sm font-medium truncate w-full text-center">{album.name}</div>
                  <div className="text-[10px] text-muted-foreground">{album._count.media} файлов</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {showCreate && <CreateAlbumModal onClose={() => setShowCreate(false)} onCreated={(album) => { setShowCreate(false); setAlbums([album, ...albums]); }} />}
      </div>
    </div>
  );
}

function CreateAlbumModal({ onClose, onCreated }: { onClose: () => void; onCreated: (album: Album) => void }) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, description: description || null }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated({ ...data.album, media: [], _count: { media: 0 } });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex w-full max-w-sm flex-col rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold">Новый альбом</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-16 resize-none" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Отмена</button>
          <button onClick={handleSave} disabled={saving || !name} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
            {saving ? "..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
