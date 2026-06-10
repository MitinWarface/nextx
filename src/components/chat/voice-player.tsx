"use client";

import * as React from "react";
import { Play, Pause, Loader2, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoicePlayerProps {
  src: string;
  durationSec?: number;
  isOutgoing: boolean;
  messageId?: string;
  existingTranscript?: string | null;
}

const BAR_COUNT = 38;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
const SPEED_STORAGE_KEY = "nextx-voice-speed";
const POSITION_STORAGE_PREFIX = "nextx-voice-pos-";

const FALLBACK_BARS: number[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  return (
    0.25 +
    0.35 * Math.abs(Math.sin(i * 0.45 + 0.6)) +
    0.3 * Math.abs(Math.sin(i * 0.9 + 1.7)) +
    0.1 * Math.abs(Math.cos(i * 1.7))
  );
});

function getSavedSpeed(): number {
  try {
    const v = localStorage.getItem(SPEED_STORAGE_KEY);
    if (v) {
      const n = parseFloat(v);
      if (SPEEDS.includes(n as any)) return n;
    }
  } catch {}
  return 1;
}

function saveSpeed(speed: number) {
  try {
    localStorage.setItem(SPEED_STORAGE_KEY, String(speed));
  } catch {}
}

function getSavedPosition(messageId: string): number {
  try {
    const v = localStorage.getItem(POSITION_STORAGE_PREFIX + messageId);
    if (v) {
      const n = parseFloat(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {}
  return 0;
}

function savePosition(messageId: string, time: number) {
  try {
    if (time > 1) {
      localStorage.setItem(POSITION_STORAGE_PREFIX + messageId, String(time));
    }
  } catch {}
}

function clearSavedPosition(messageId: string) {
  try {
    localStorage.removeItem(POSITION_STORAGE_PREFIX + messageId);
  } catch {}
}

export function VoicePlayer({
  src,
  durationSec,
  isOutgoing,
  messageId,
  existingTranscript,
}: VoicePlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [actualDuration, setActualDuration] = React.useState(durationSec ?? 0);
  const [bars, setBars] = React.useState<number[] | null>(null);
  const [transcript, setTranscript] = React.useState<string | null>(
    existingTranscript ?? null,
  );
  const [transcribing, setTranscribing] = React.useState(false);
  const [speed, setSpeed] = React.useState(getSavedSpeed);
  const [resumeOffer, setResumeOffer] = React.useState<number | null>(null);
  const hasOfferedResumeRef = React.useRef(false);

  // Offer resume on mount
  React.useEffect(() => {
    if (!messageId || hasOfferedResumeRef.current) return;
    hasOfferedResumeRef.current = true;
    const saved = getSavedPosition(messageId);
    if (saved > 2 && durationSec && saved < durationSec - 2) {
      setResumeOffer(saved);
    }
  }, [messageId, durationSec]);

  // Save position periodically and on pause/end
  React.useEffect(() => {
    if (!messageId) return;
    const audio = audioRef.current;
    if (!audio) return;

    const save = () => {
      if (audio.currentTime > 1) {
        savePosition(messageId, audio.currentTime);
      }
    };

    const handlePause = () => save();
    const handleEnded = () => clearSavedPosition(messageId);

    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    const interval = setInterval(save, 3000);

    return () => {
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      clearInterval(interval);
      save();
    };
  }, [messageId]);

  // Apply speed to audio element
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const cycleSpeed = () => {
    setSpeed((prev) => {
      const idx = SPEEDS.indexOf(prev as any);
      const next = SPEEDS[(idx + 1) % SPEEDS.length];
      saveSpeed(next);
      return next;
    });
  };

  const jumpToResume = () => {
    if (resumeOffer !== null && audioRef.current) {
      audioRef.current.currentTime = resumeOffer;
      setCurrentTime(resumeOffer);
      setResumeOffer(null);
      void audioRef.current.play();
    }
  };

  const dismissResume = () => {
    setResumeOffer(null);
  };

  // Пытаемся получить реальную волну из аудиофайла
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
    return () => {
      cancelled = true;
    };
  }, [src]);

  const total = actualDuration > 0 ? actualDuration : durationSec ?? 0;
  const progress = total > 0 ? Math.min(1, currentTime / total) : 0;

  const togglePlay = React.useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
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

  const handleTranscribe = React.useCallback(async () => {
    if (transcribing || transcript) return;
    setTranscribing(true);
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const file = new File([blob], "voice.webm", { type: blob.type });
      const fd = new FormData();
      fd.append("audio", file);
      const r = await fetch("/api/voice-transcribe", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (r.ok) {
        const data = (await r.json()) as { text?: string; hint?: string };
        if (data.text) {
          setTranscript(data.text);
        } else if (data.hint) {
          setTranscript(data.hint);
        }
      }
    } catch {
      // ignore
    } finally {
      setTranscribing(false);
    }
  }, [src, transcribing, transcript]);

  return (
    <div className="flex flex-col">
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
        {formatVoiceTime(currentTime > 0 ? currentTime : total)}
      </span>

      {/* Speed button */}
      <button
        type="button"
        onClick={cycleSpeed}
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
          isOutgoing
            ? "text-bubble-outgoingFg/70 hover:bg-bubble-outgoingFg/15"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
          speed !== 1 && "text-primary",
        )}
        title="Скорость воспроизведения"
      >
        {speed}x
      </button>

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
          e.currentTarget.playbackRate = speed;
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (messageId) clearSavedPosition(messageId);
        }}
        className="hidden"
      />

      {/* Transcribe button */}
      {!isOutgoing && !transcript && messageId && (
        <button
          type="button"
          onClick={handleTranscribe}
          disabled={transcribing}
          className={cn(
            "shrink-0 rounded-full p-1 transition-colors",
            transcribing
              ? "text-muted-foreground"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
          )}
          title="Расшифровать"
        >
          {transcribing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Languages className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Transcript display */}
      {transcript && (
        <p className="mt-1 w-full px-2.5 text-[12px] leading-relaxed text-muted-foreground italic">
          {transcript}
        </p>
      )}
    </div>

    {/* Resume playback offer */}
    {resumeOffer !== null && !isPlaying && (
      <div className="flex items-center gap-2 px-2.5 pb-1.5">
        <span className="text-[11px] text-primary">
          Продолжить с {formatVoiceTime(resumeOffer)}?
        </span>
        <button
          type="button"
          onClick={jumpToResume}
          className="text-[11px] font-medium text-primary underline hover:text-primary/80"
        >
          Да
        </button>
        <button
          type="button"
          onClick={dismissResume}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Нет
        </button>
      </div>
    )}
    </div>
  );
}

function formatVoiceTime(sec: number): string {
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
  const smoothed: number[] = result.map((v) => {
    const n = v / max;
    return Math.pow(n, 0.7);
  });
  return smoothed.map((v) => Math.max(0.12, v));
}
