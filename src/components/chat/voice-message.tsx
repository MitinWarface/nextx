"use client";

import * as React from "react";
import { Mic, MicOff, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [analyserNode, setAnalyserNode] = React.useState<AnalyserNode | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const startTimeRef = React.useRef<number>(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animRef = React.useRef<number>(0);

  // Start recording
  const startRecording = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      setAnalyserNode(analyser);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch {
      // mic access denied
    }
  }, []);

  // Stop recording
  const stopRecording = React.useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Create blob inside onstop to capture the final chunk
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        if (blob.size > 0) {
          onSend(blob, duration);
        }
      };
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setAnalyserNode(null);
  }, [duration, onSend]);

  // Cancel
  const handleCancel = React.useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      chunksRef.current = [];
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setAnalyserNode(null);
    setDuration(0);
    onCancel();
  }, [onCancel]);

  // Waveform canvas
  React.useEffect(() => {
    if (!analyserNode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const y = (canvas.height - barHeight) / 2;
        ctx.fillStyle = "hsl(210, 80%, 55%)";
        ctx.fillRect(x, y, barWidth, barHeight);
        x += barWidth + 1;
        if (x > canvas.width) break;
      }
    };
    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, [analyserNode]);

  // Auto-start on mount
  React.useEffect(() => {
    startRecording();
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
      <button
        type="button"
        onClick={handleCancel}
        className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <div className={cn("h-3 w-3 rounded-full", isRecording ? "animate-pulse bg-red-500" : "bg-muted")} />
        <span className="font-mono text-sm tabular-nums">{fmt(duration)}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={200}
        height={40}
        className="h-10 flex-1"
      />

      <button
        type="button"
        onClick={stopRecording}
        className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Voice message playback component with waveform visualization.
 */
export function VoiceMessagePlayer({
  audioUrl,
  isOutgoing,
}: {
  audioUrl: string;
  isOutgoing?: boolean;
}) {
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const togglePlay = React.useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setProgress(audio.currentTime);
    };
    const onLoaded = () => {
      setDuration(audio.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  // Simple waveform bars
  React.useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bars = 50;
    const barW = canvas.width / bars;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deterministic waveform heights based on bar index
    for (let i = 0; i < bars; i++) {
      const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const h = (seed - Math.floor(seed)) * canvas.height * 0.6 + canvas.height * 0.2;
      const x = i * barW;
      const y = (canvas.height - h) / 2;
      const progressRatio = duration > 0 ? progress / duration : 0;
      ctx.fillStyle = i / bars < progressRatio
        ? isOutgoing ? "rgba(255,255,255,0.9)" : "hsl(210, 80%, 55%)"
        : isOutgoing ? "rgba(255,255,255,0.3)" : "rgba(128,128,128,0.4)";
      ctx.fillRect(x, y, barW - 1, h);
    }
  }, [progress, duration, isOutgoing]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isOutgoing ? "bg-white/20 text-white" : "bg-primary/10 text-primary",
        )}
      >
        {playing ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <canvas ref={canvasRef} width={150} height={32} className="h-8 w-[150px]" />
      <span className={cn("text-[11px] tabular-nums", isOutgoing ? "text-white/70" : "text-muted-foreground")}>
        {playing ? fmt(progress) : fmt(duration)}
      </span>
    </div>
  );
}
