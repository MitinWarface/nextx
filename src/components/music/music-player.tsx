"use client";

import * as React from "react";
import { useMusicStore } from "@/store/music-store";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
} from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    setPlaying,
    setVolume,
    setCurrentTime,
    nextTrack,
    prevTrack,
    togglePlaylist,
    playlistOpen,
    queue,
  } = useMusicStore();

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const progressRef = React.useRef<HTMLDivElement>(null);
  const [duration, setDuration] = React.useState(0);
  const [seeking, setSeeking] = React.useState(false);
  const [muted, setMuted] = React.useState(false);

  // Create audio element once
  React.useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      if (!seeking) setCurrentTime(audio.currentTime);
    });
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("ended", () => nextTrack());
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));

    return () => {
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load track when currentTrack changes
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = `/api/files/${currentTrack.fileId}`;
    audio.volume = muted ? 0 : volume;
    audio.play().catch(() => {});
  }, [currentTrack, volume, muted]);

  // Sync volume
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // Play/pause toggle
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // Seek handler
  const handleSeek = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      const audio = audioRef.current;
      if (!bar || !audio || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = pct * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration, setCurrentTime],
  );

  // Persist position to localStorage
  React.useEffect(() => {
    if (!currentTrack) return;
    const key = `music_pos_${currentTrack.id}`;
    const interval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        localStorage.setItem(key, String(audioRef.current.currentTime));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [currentTrack]);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        {/* Track info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
            🎵
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{currentTrack.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {currentTrack.artist ?? "Неизвестный исполнитель"}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevTrack}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Предыдущий"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying(!isPlaying)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:brightness-110"
            aria-label={isPlaying ? "Пауза" : "Воспроизведение"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={nextTrack}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Следующий"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="hidden items-center gap-2 sm:flex">
          <span className="w-10 text-right text-xs text-muted-foreground">
            {formatDuration(currentTime)}
          </span>
          <div
            ref={progressRef}
            className="relative h-1.5 w-40 cursor-pointer rounded-full bg-muted lg:w-64"
            onMouseDown={(e) => {
              setSeeking(true);
              handleSeek(e);
            }}
            onMouseMove={(e) => {
              if (seeking) handleSeek(e);
            }}
            onMouseUp={() => setSeeking(false)}
            onMouseLeave={() => setSeeking(false)}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-10 text-xs text-muted-foreground">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="hidden items-center gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={muted ? "Включить звук" : "Выключить звук"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (muted) setMuted(false);
            }}
            className="h-1 w-20 cursor-pointer accent-primary"
          />
        </div>

        {/* Playlist toggle */}
        {queue.length > 1 && (
          <button
            type="button"
            onClick={togglePlaylist}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground",
              playlistOpen ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
            aria-label="Плейлист"
          >
            <ListMusic className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
