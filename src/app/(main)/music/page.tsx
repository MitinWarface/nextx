"use client";

import * as React from "react";
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Trash2,
  List,
  Search,
  Upload,
  Globe,
  Lock,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface Track {
  id: string;
  title: string;
  artist: string | null;
  fileId: string;
  duration: number | null;
  coverId: string | null;
  createdAt: string;
  user: { id: string; username: string; displayName: string };
}

interface Playlist {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  _count: { tracks: number };
  tracks: Array<{ track: Track }>;
}

function formatDuration(sec: number | null) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MusicPage() {
  const [tracks, setTracks] = React.useState<Track[]>([]);
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const [tab, setTab] = React.useState<"tracks" | "playlists">("tracks");
  const [trackTab, setTrackTab] = React.useState<"my" | "public">("my");
  const [playlistTab, setPlaylistTab] = React.useState<"my" | "public">("my");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [currentTrack, setCurrentTrack] = React.useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [volume, setVolume] = React.useState(0.8);

  const [showUpload, setShowUpload] = React.useState(false);
  const [uploadForm, setUploadForm] = React.useState({ title: "", artist: "" });
  const [showCreatePlaylist, setShowCreatePlaylist] = React.useState(false);
  const [playlistName, setPlaylistName] = React.useState("");

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    return () => { audioRef.current?.pause(); };
  }, []);

  const loadTracks = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: trackTab });
      if (search) params.set("search", search);
      const res = await fetch(`/api/music/tracks?${params}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setTracks(json.tracks ?? []);
      }
    } catch { toast.error("Failed to load tracks"); }
    finally { setLoading(false); }
  }, [trackTab, search]);

  const loadPlaylists = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/music/playlists?tab=${playlistTab}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setPlaylists(json.playlists ?? []);
      }
    } catch { toast.error("Failed to load playlists"); }
  }, [playlistTab]);

  React.useEffect(() => { loadTracks(); }, [loadTracks]);
  React.useEffect(() => { loadPlaylists(); }, [loadPlaylists]);

  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); }
      else { audioRef.current?.play(); setIsPlaying(true); }
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.src = `/api/files/${track.fileId}`;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title.trim()) { toast.error("Title required"); return; }
    toast.success("Track uploaded (demo)");
    setShowUpload(false);
    setUploadForm({ title: "", artist: "" });
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) { toast.error("Name required"); return; }
    try {
      const res = await fetch("/api/music/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: playlistName.trim() }),
      });
      if (res.ok) {
        toast.success("Playlist created");
        setShowCreatePlaylist(false);
        setPlaylistName("");
        loadPlaylists();
      }
    } catch { toast.error("Network error"); }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm("Delete this track?")) return;
    try {
      const res = await fetch(`/api/music/tracks?trackId=${trackId}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) { toast.success("Track deleted"); loadTracks(); }
    } catch { toast.error("Network error"); }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm("Delete this playlist?")) return;
    try {
      const res = await fetch(`/api/music/playlists?playlistId=${playlistId}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) { toast.success("Playlist deleted"); loadPlaylists(); }
    } catch { toast.error("Network error"); }
  };

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-auto p-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Music className="h-6 w-6" /> Music
            </h1>
            <div className="flex gap-2">
              <Button onClick={() => setShowUpload(!showUpload)} size="sm">
                <Upload className="h-4 w-4" /> Upload
              </Button>
              <Button onClick={() => setShowCreatePlaylist(!showCreatePlaylist)} size="sm" variant="outline">
                <Plus className="h-4 w-4" /> Playlist
              </Button>
            </div>
          </div>

          {showUpload && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="font-medium">Upload Track</h3>
              <Input placeholder="Title" value={uploadForm.title} onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))} />
              <Input placeholder="Artist (optional)" value={uploadForm.artist} onChange={(e) => setUploadForm((f) => ({ ...f, artist: e.target.value }))} />
              <div className="flex gap-2">
                <Button onClick={handleUpload} size="sm">Upload</Button>
                <Button onClick={() => setShowUpload(false)} variant="ghost" size="sm">Cancel</Button>
              </div>
            </div>
          )}

          {showCreatePlaylist && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="font-medium">Create Playlist</h3>
              <Input placeholder="Playlist name" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={handleCreatePlaylist} size="sm">Create</Button>
                <Button onClick={() => setShowCreatePlaylist(false)} variant="ghost" size="sm">Cancel</Button>
              </div>
            </div>
          )}

          <div className="flex rounded-md border border-border overflow-hidden">
            <button type="button" onClick={() => setTab("tracks")} className={`px-4 py-2 text-sm ${tab === "tracks" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <Music className="inline h-3.5 w-3.5 mr-1" /> Tracks
            </button>
            <button type="button" onClick={() => setTab("playlists")} className={`px-4 py-2 text-sm ${tab === "playlists" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <List className="inline h-3.5 w-3.5 mr-1" /> Playlists
            </button>
          </div>

          {tab === "tracks" && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button type="button" onClick={() => setTrackTab("my")} className={`px-3 py-1.5 text-xs ${trackTab === "my" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                    My Tracks
                  </button>
                  <button type="button" onClick={() => setTrackTab("public")} className={`px-3 py-1.5 text-xs ${trackTab === "public" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                    <Globe className="inline h-3 w-3 mr-1" /> Public
                  </button>
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search tracks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No tracks found</div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                        <th className="p-3 w-10"></th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Artist</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">By</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracks.map((t) => (
                        <tr key={t.id} className={`border-b border-border/50 hover:bg-accent/30 ${currentTrack?.id === t.id ? "bg-primary/5" : ""}`}>
                          <td className="p-3">
                            <button type="button" onClick={() => playTrack(t)} className="rounded-full p-1.5 hover:bg-primary/10">
                              {currentTrack?.id === t.id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="p-3 font-medium">{t.title}</td>
                          <td className="p-3 text-muted-foreground">{t.artist ?? "—"}</td>
                          <td className="p-3 text-muted-foreground">{formatDuration(t.duration)}</td>
                          <td className="p-3 text-muted-foreground">{t.user.displayName}</td>
                          <td className="p-3">
                            {trackTab === "my" && (
                              <button type="button" onClick={() => handleDeleteTrack(t.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "playlists" && (
            <>
              <div className="flex rounded-md border border-border overflow-hidden w-fit">
                <button type="button" onClick={() => setPlaylistTab("my")} className={`px-3 py-1.5 text-xs ${playlistTab === "my" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                  My Playlists
                </button>
                <button type="button" onClick={() => setPlaylistTab("public")} className={`px-3 py-1.5 text-xs ${playlistTab === "public" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                  <Globe className="inline h-3 w-3 mr-1" /> Public
                </button>
              </div>

              {playlists.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No playlists</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map((pl) => (
                    <div key={pl.id} className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{pl.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pl._count.tracks} tracks · {pl.isPublic ? <Globe className="inline h-3 w-3" /> : <Lock className="inline h-3 w-3" />}
                          </p>
                        </div>
                        {playlistTab === "my" && (
                          <button type="button" onClick={() => handleDeletePlaylist(pl.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {pl.tracks.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {pl.tracks.slice(0, 3).map((pt) => (
                            <div key={pt.track.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Music className="h-3 w-3" />
                              <span className="truncate">{pt.track.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-sidebar border-t border-border flex items-center px-4 gap-4 z-50">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 shrink-0">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist ?? "Unknown artist"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="rounded-full p-2 hover:bg-accent">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              className="flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
