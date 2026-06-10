"use client";

import * as React from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoicePostProps {
  src: string;
  durationSec?: number | null;
  isOutgoing: boolean;
}

const BAR_COUNT = 38;
const FALLBACK_BARS: number[] = Array.from({ length: BAR_COUNT }, (_, i) =>
  0.25 +
  0.35 * Math.abs(Math.sin(i * 0.45 + 0.6)) +
  0.3 * Math.abs(Math.sin(i * 0.9 + 1.7)) +
  0.1 * Math.abs(Math.cos(i * 1.7)),
);

export function VoicePost({ src, durationSec, isOutgoing }: VoicePostProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [actualDuration, setActualDuration] = React.useState(durationSec ?? 0);
  const [bars, setBars] = React.useState<number[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setBars(null);
    (async () => {
      try {
        const decoded = await decodeWaveform(src, BAR_COUNT);
        if (!cancelled) setBars(decoded);
      } catch {
        if (!cancelled) setBars(FALLBACK_BARS);
      }
    })();
    return () => { cancelled = true; };
  }, [src]);

  const total = actualDuration > 0 ? actualDuration : durationSec ?? 0;
  const progress = total > 0 ? Math.min(1, currentTime / total) : 0;

  const togglePlay = React.useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }, []);

  const onBarClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = audioRef.current;
      if (!el || !total) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      el.currentTime = ratio * total;
      setCurrentTime(el.currentTime);
      if (el.paused) void el.play();
    },
    [total],
  );

  const wave = bars ?? FALLBACK_BARS;
  const accent = isOutgoing ? "bg-bubble-outgoingFg" : "bg-primary";
  const muted = isOutgoing ? "bg-bubble-outgoingFg/30" : "bg-foreground/25";
  const fgMuted = isOutgoing ? "text-bubble-outgoingFg/60" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2.5 px-2.5 py-1.5">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
          isOutgoing
            ? "bg-bubble-outgoingFg/15 text-bubble-outgoingFg"
            : "bg-primary/15 text-primary",
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" fill="currentColor" />
        ) : (
          <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
        )}
      </button>

      <div
        role="slider"
        aria-label="Позиция воспроизведения"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(currentTime)}
        onClick={onBarClick}
        className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2px]"
      >
        {wave.map((amp, i) => {
          const ratio = i / wave.length;
          const played = ratio <= progress;
          const heightPct = Math.max(12, Math.min(100, amp * 100));
          return (
            <span
              key={i}
              className={cn(
                "block w-[2px] shrink-0 rounded-full transition-colors",
                played ? accent : muted,
              )}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>

      <span className={cn("shrink-0 text-[11.5px] tabular-nums", fgMuted)}>
        {formatVoicePostTime(currentTime > 0 ? currentTime : total)}
      </span>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setActualDuration(d);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        className="hidden"
      />
    </div>
  );
}

function formatVoicePostTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function decodeWaveform(src: string, bars: number): Promise<number[]> {
  if (typeof window === "undefined") return FALLBACK_BARS;
  const AudioCtxCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtxCtor) return FALLBACK_BARS;

  const res = await fetch(src);
  if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
  const arr = await res.arrayBuffer();
  const ctx = new AudioCtxCtor();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(arr);
  } finally {
    void ctx.close();
  }
  const channel = buffer.getChannelData(0);
  if (channel.length === 0) return FALLBACK_BARS;
  const samplesPerBar = Math.max(1, Math.floor(channel.length / bars));
  const result: number[] = [];
  for (let i = 0; i < bars; i++) {
    let peak = 0;
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channel.length);
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j]);
      if (v > peak) peak = v;
    }
    result.push(peak);
  }
  const max = Math.max(...result, 0.0001);
  return result.map((v) => {
    const n = v / max;
    return Math.max(0.12, Math.pow(n, 0.7));
  });
}
