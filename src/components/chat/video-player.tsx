"use client";

import * as React from "react";
import { Play, Pause, Maximize, Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  messageId?: string;
}

const VIDEO_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
const VIDEO_SPEED_KEY = "nextx-video-speed";
const VIDEO_POS_PREFIX = "nextx-video-pos-";

function getSavedVideoSpeed(): number {
  try {
    const v = localStorage.getItem(VIDEO_SPEED_KEY);
    if (v) {
      const n = parseFloat(v);
      if (VIDEO_SPEEDS.includes(n as any)) return n;
    }
  } catch {}
  return 1;
}

function saveVideoSpeed(speed: number) {
  try {
    localStorage.setItem(VIDEO_SPEED_KEY, String(speed));
  } catch {}
}

function getSavedVideoPosition(messageId: string): number {
  try {
    const v = localStorage.getItem(VIDEO_POS_PREFIX + messageId);
    if (v) {
      const n = parseFloat(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {}
  return 0;
}

function saveVideoPosition(messageId: string, time: number) {
  try {
    if (time > 1) {
      localStorage.setItem(VIDEO_POS_PREFIX + messageId, String(time));
    }
  } catch {}
}

function clearSavedVideoPosition(messageId: string) {
  try {
    localStorage.removeItem(VIDEO_POS_PREFIX + messageId);
  } catch {}
}

export function VideoPlayer({ src, poster, className, messageId }: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [buffered, setBuffered] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [speed, setSpeed] = React.useState(getSavedVideoSpeed);
  const [resumeOffer, setResumeOffer] = React.useState<number | null>(null);
  const hasOfferedResumeRef = React.useRef(false);

  // Offer resume on mount
  React.useEffect(() => {
    if (!messageId || hasOfferedResumeRef.current) return;
    hasOfferedResumeRef.current = true;
    const saved = getSavedVideoPosition(messageId);
    if (saved > 2) {
      setResumeOffer(saved);
    }
  }, [messageId]);

  // Save position periodically
  React.useEffect(() => {
    if (!messageId) return;
    const video = videoRef.current;
    if (!video) return;

    const save = () => {
      if (video.currentTime > 1) {
        saveVideoPosition(messageId, video.currentTime);
      }
    };

    const handlePause = () => save();
    const handleEnded = () => clearSavedVideoPosition(messageId);

    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    const interval = setInterval(save, 3000);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      clearInterval(interval);
      save();
    };
  }, [messageId]);

  // Apply speed
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const cycleSpeed = () => {
    setSpeed((prev) => {
      const idx = VIDEO_SPEEDS.indexOf(prev as any);
      const next = VIDEO_SPEEDS[(idx + 1) % VIDEO_SPEEDS.length];
      saveVideoSpeed(next);
      return next;
    });
  };

  const jumpToResume = () => {
    if (resumeOffer !== null && videoRef.current) {
      videoRef.current.currentTime = resumeOffer;
      setCurrentTime(resumeOffer);
      setResumeOffer(null);
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const togglePlay = React.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = React.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  const handleTimeUpdate = React.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
  }, []);

  const handleProgress = React.useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const buf = el.buffered;
    if (buf.length > 0) {
      setBuffered((buf.end(buf.length - 1) / el.duration) * 100);
    }
  }, []);

  const handleSeek = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    el.currentTime = pct * el.duration;
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onEnd = () => setPlaying(false);
    el.addEventListener("ended", onEnd);
    return () => el.removeEventListener("ended", onEnd);
  }, []);

  return (
    <div className={`group relative overflow-hidden rounded-lg bg-black ${className ?? ""}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onLoadedData={() => setLoading(false)}
        onClick={togglePlay}
        className="aspect-video w-full cursor-pointer object-contain"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Resume offer overlay */}
      {resumeOffer !== null && !playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-white">
              Продолжить с {formatTime(resumeOffer)}?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={jumpToResume}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Да
              </button>
              <button
                type="button"
                onClick={() => {
                  setResumeOffer(null);
                  if (videoRef.current) videoRef.current.currentTime = 0;
                }}
                className="rounded-md bg-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/30"
              >
                С начала
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Progress bar */}
        <div
          className="relative mb-2 h-1 w-full cursor-pointer rounded-full bg-white/30"
          onClick={handleSeek}
        >
          <div className="absolute left-0 top-0 h-full rounded-full bg-white/30" style={{ width: `${buffered}%` }} />
          <div className="absolute left-0 top-0 h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3 text-white">
          <button type="button" onClick={togglePlay} className="rounded p-1 hover:bg-white/20">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <span className="text-xs tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Speed button */}
            <button
              type="button"
              onClick={cycleSpeed}
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums hover:bg-white/20",
                speed !== 1 && "text-primary",
              )}
              title="Скорость воспроизведения"
            >
              {speed}x
            </button>
            <button type="button" onClick={toggleMute} className="rounded p-1 hover:bg-white/20">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (videoRef.current) videoRef.current.volume = v;
              }}
              className="h-1 w-16 accent-primary"
            />
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  } else {
                    videoRef.current.requestFullscreen().catch(() => {});
                  }
                }
              }}
              className="rounded p-1 hover:bg-white/20"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HLSPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  messageId?: string;
}

export function HLSPlayer({ src, poster, className, messageId }: HLSPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [quality, setQuality] = React.useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = React.useState<number>(-1);
  const [speed, setSpeed] = React.useState(getSavedVideoSpeed);
  const [resumeOffer, setResumeOffer] = React.useState<number | null>(null);
  const hasOfferedResumeRef = React.useRef(false);
  const hlsRef = React.useRef<any>(null);

  // Offer resume on mount
  React.useEffect(() => {
    if (!messageId || hasOfferedResumeRef.current) return;
    hasOfferedResumeRef.current = true;
    const saved = getSavedVideoPosition(messageId);
    if (saved > 2) {
      setResumeOffer(saved);
    }
  }, [messageId]);

  // Save position periodically
  React.useEffect(() => {
    if (!messageId) return;
    const video = videoRef.current;
    if (!video) return;

    const save = () => {
      if (video.currentTime > 1) {
        saveVideoPosition(messageId, video.currentTime);
      }
    };

    const handlePause = () => save();
    const handleEnded = () => clearSavedVideoPosition(messageId);

    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    const interval = setInterval(save, 3000);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      clearInterval(interval);
      save();
    };
  }, [messageId]);

  // Apply speed
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const cycleSpeed = () => {
    setSpeed((prev) => {
      const idx = VIDEO_SPEEDS.indexOf(prev as any);
      const next = VIDEO_SPEEDS[(idx + 1) % VIDEO_SPEEDS.length];
      saveVideoSpeed(next);
      return next;
    });
  };

  const jumpToResume = () => {
    if (resumeOffer !== null && videoRef.current) {
      videoRef.current.currentTime = resumeOffer;
      setCurrentTime(resumeOffer);
      setResumeOffer(null);
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let hls: any = null;

    const loadHLS = async () => {
      try {
        const Hls = (await import("hls.js")).default;
        if (Hls.isSupported()) {
          hls = new Hls({
            startLevel: -1,
          });
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(el);
          hls.on(Hls.Events.MANIFEST_PARSED, (_e: any, data: any) => {
            const levels = data.levels.map((l: any) => l.height + "p");
            setQuality(["Auto", ...levels]);
            setLoading(false);
          });
          hls.on(Hls.Events.LEVEL_SWITCHED, (_e: any, data: any) => {
            setCurrentQuality(data.level);
          });
        } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
          el.src = src;
          el.addEventListener("loadedmetadata", () => setLoading(false), { once: true });
        }
      } catch {
        el.src = src;
        setLoading(false);
      }
    };

    loadHLS();

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`group relative overflow-hidden rounded-lg bg-black ${className ?? ""}`}>
      <video
        ref={videoRef}
        poster={poster}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedData={() => setDuration(videoRef.current?.duration ?? 0)}
        onClick={togglePlay}
        className="aspect-video w-full cursor-pointer object-contain"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      )}

      {/* Resume offer overlay */}
      {resumeOffer !== null && !playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-white">
              Продолжить с {formatTime(resumeOffer)}?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={jumpToResume}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Да
              </button>
              <button
                type="button"
                onClick={() => {
                  setResumeOffer(null);
                  if (videoRef.current) videoRef.current.currentTime = 0;
                }}
                className="rounded-md bg-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/30"
              >
                С начала
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="relative mb-2 h-1 w-full cursor-pointer rounded-full bg-white/30" onClick={handleSeek}>
          <div className="absolute left-0 top-0 h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-3 text-white">
          <button type="button" onClick={togglePlay} className="rounded p-1 hover:bg-white/20">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="text-xs tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={cycleSpeed}
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums hover:bg-white/20",
              speed !== 1 && "text-primary",
            )}
            title="Скорость воспроизведения"
          >
            {speed}x
          </button>
          {quality.length > 1 && (
            <span className="ml-auto text-xs text-white/70">
              {quality[currentQuality + 1] ?? "Auto"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
