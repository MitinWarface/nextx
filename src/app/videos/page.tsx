"use client";

import * as React from "react";
import { X, Play, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoItem {
  id: string;
  content?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  hlsUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt: string;
  chat: { id: string; name?: string | null };
  sender: { id: string; displayName: string; avatarUrl?: string | null };
}

export default function VideosPage() {
  const [videos, setVideos] = React.useState<VideoItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedVideo, setSelectedVideo] = React.useState<VideoItem | null>(null);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const fetchVideos = React.useCallback(async (c?: string | null) => {
    const params = new URLSearchParams();
    if (c) params.set("cursor", c);
    const res = await fetch(`/api/videos?${params}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      return data as { videos: VideoItem[]; nextCursor: string | null };
    }
    return { videos: [], nextCursor: null };
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchVideos();
      setVideos(data.videos);
      setCursor(data.nextCursor);
      setLoading(false);
    })();
  }, [fetchVideos]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchVideos(cursor);
    setVideos((prev) => [...prev, ...data.videos]);
    setCursor(data.nextCursor);
    setLoadingMore(false);
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
        <a href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </a>
        <h1 className="text-lg font-semibold">Видео</h1>
      </header>

      <div className="mx-auto max-w-5xl p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-muted aspect-video" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Play className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">Нет видео</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {videos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setSelectedVideo(video)}
                  className="group relative overflow-hidden rounded-xl bg-muted aspect-video transition-transform hover:scale-[1.02]"
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.fileName ?? "video"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Play className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="h-5 w-5 fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="truncate text-[11px] font-medium text-white">
                      {video.fileName ?? video.chat.name ?? "Видео"}
                    </p>
                    {video.fileSize && (
                      <p className="text-[10px] text-white/70">{formatSize(video.fileSize)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {cursor && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-border px-6 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {loadingMore ? "Загрузка…" : "Загрузить ещё"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            {selectedVideo.hlsUrl ? (
              <video
                src={selectedVideo.hlsUrl}
                controls
                autoPlay
                className="w-full rounded-lg"
              />
            ) : selectedVideo.mediaUrl ? (
              <video
                src={selectedVideo.mediaUrl}
                controls
                autoPlay
                className="w-full rounded-lg"
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                Видео недоступно
              </div>
            )}
            <div className="mt-3 text-sm text-white/70">
              <p className="font-medium text-white">{selectedVideo.sender.displayName}</p>
              <p>{selectedVideo.chat.name} · {new Date(selectedVideo.createdAt).toLocaleDateString("ru-RU")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
