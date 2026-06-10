"use client";

import * as React from "react";
import { useMusicStore, type MusicTrackData } from "@/store/music-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Plus,
  Search,
  Music,
  ListMusic,
  Heart,
  X,
  Trash2,
} from "lucide-react";

interface PlaylistData {
  id: string;
  name: string;
  isPublic: boolean;
  _count: { tracks: number };
  tracks: Array<{ track: MusicTrackData }>;
}

export function MusicLibrary() {
  const user = useAuthStore((s) => s.user);
  const { currentTrack, isPlaying, setQueue, setPlaying } = useMusicStore();
  const [tab, setTab] = React.useState<"tracks" | "playlists" | "favorites">("tracks");
  const [tracks, setTracks] = React.useState<MusicTrackData[]>([]);
  const [playlists, setPlaylists] = React.useState<PlaylistData[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [uploadArtist, setUploadArtist] = React.useState("");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Load tracks
  const loadTracks = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: "my" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/music/tracks?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Load playlists
  const loadPlaylists = React.useCallback(async () => {
    try {
      const res = await fetch("/api/music/playlists?tab=my", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (tab === "tracks") void loadTracks();
    else if (tab === "playlists") void loadPlaylists();
  }, [tab, loadTracks, loadPlaylists]);

  // Create playlist
  const handleCreatePlaylist = React.useCallback(async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/music/playlists", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setCreateOpen(false);
        setNewName("");
        void loadPlaylists();
      }
    } catch {
      // ignore
    }
  }, [newName, loadPlaylists]);

  // Delete playlist
  const handleDeletePlaylist = React.useCallback(
    async (playlistId: string) => {
      if (!confirm("Удалить плейлист?")) return;
      try {
        const res = await fetch(`/api/music/playlists?playlistId=${playlistId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) void loadPlaylists();
      } catch {
        // ignore
      }
    },
    [loadPlaylists],
  );

  // Upload track
  const handleUpload = React.useCallback(async () => {
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      // First upload the file via cloud
      const fd = new FormData();
      fd.append("file", uploadFile);
      const fileRes = await fetch("/api/cloud/files/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!fileRes.ok) throw new Error("upload_failed");
      const fileData = await fileRes.json();
      const fileId = fileData.file?.id ?? fileData.id;

      // Then create the track
      const trackRes = await fetch("/api/music/tracks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          artist: uploadArtist.trim() || null,
          fileId,
        }),
      });
      if (trackRes.ok) {
        setUploadOpen(false);
        setUploadTitle("");
        setUploadArtist("");
        setUploadFile(null);
        void loadTracks();
      }
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  }, [uploadFile, uploadTitle, uploadArtist, loadTracks]);

  const playTrack = React.useCallback(
    (track: MusicTrackData, index: number) => {
      if (currentTrack?.id === track.id) {
        setPlaying(!isPlaying);
      } else {
        setQueue(tracks, index);
      }
    },
    [currentTrack, isPlaying, tracks, setQueue, setPlaying],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { key: "tracks" as const, label: "Все треки", icon: Music },
          { key: "playlists" as const, label: "Плейлисты", icon: ListMusic },
          { key: "favorites" as const, label: "Избранное", icon: Heart },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск треков…"
            className="h-8 w-full rounded-md border border-border bg-muted/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" />
          Загрузить
        </button>
        {tab === "playlists" && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            Плейлист
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "tracks" && (
          <div className="space-y-1">
            {loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">Загрузка…</div>
            )}
            {!loading && tracks.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Нет треков. Загрузите первый!
              </div>
            )}
            {tracks.map((track, i) => (
              <div
                key={track.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50 group",
                  currentTrack?.id === track.id && "bg-accent/70",
                )}
              >
                <button
                  type="button"
                  onClick={() => playTrack(track, i)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="ml-0.5 h-3.5 w-3.5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{track.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {track.artist ?? "Неизвестный"}
                  </div>
                </div>
                {track.duration && (
                  <span className="text-xs text-muted-foreground">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "playlists" && (
          <div className="space-y-2">
            {playlists.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Нет плейлистов
              </div>
            )}
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <ListMusic className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{pl.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {pl._count.tracks} треков
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePlaylist(pl.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "favorites" && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Избранные треки скоро будут доступны
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Новый плейлист</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название плейлиста"
              className="mb-4 h-9 w-full rounded-md border border-border bg-muted/50 px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
            />
            <button
              type="button"
              onClick={handleCreatePlaylist}
              disabled={!newName.trim()}
              className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40"
            >
              Создать
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Загрузить трек</h3>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Название трека"
                className="h-9 w-full rounded-md border border-border bg-muted/50 px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                value={uploadArtist}
                onChange={(e) => setUploadArtist(e.target.value)}
                placeholder="Исполнитель (необязательно)"
                className="h-9 w-full rounded-md border border-border bg-muted/50 px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <label className="flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent/50">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                {uploadFile ? uploadFile.name : "Выберите аудиофайл"}
              </label>
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!uploadTitle.trim() || !uploadFile || uploading}
              className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40"
            >
              {uploading ? "Загрузка…" : "Загрузить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
