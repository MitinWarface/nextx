"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Video, Loader2, Send, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface VideoCircleRecorderProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  chatId: string;
}

const MAX_DURATION = 60; // 1 minute
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function VideoCircleRecorder({ open, onClose, onSent, chatId }: VideoCircleRecorderProps) {
  const [mounted, setMounted] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [blob, setBlob] = React.useState<Blob | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef<number>(0);

  React.useEffect(() => setMounted(true), []);

  const stopStream = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [stream]);

  const startCamera = React.useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 720 },
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      toast.error("Не удалось получить доступ к камере");
    }
  }, []);

  React.useEffect(() => {
    if (open && !stream) {
      void startCamera();
    }
    return () => {
      stopStream();
      setPreviewUrl(null);
      setBlob(null);
      setDuration(0);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = React.useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    startTimeRef.current = Date.now();
    setDuration(0);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const b = new Blob(chunksRef.current, { type: mimeType });
      setBlob(b);
      const url = URL.createObjectURL(b);
      setPreviewUrl(url);
      stopStream();
    };

    recorder.start(100);
    setRecording(true);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
      if (elapsed >= MAX_DURATION && recorder.state === "recording") {
        recorder.stop();
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 500);
  }, [stream, stopStream]);

  const stopRecording = React.useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleRetake = React.useCallback(() => {
    setPreviewUrl(null);
    setBlob(null);
    setDuration(0);
    void startCamera();
  }, [startCamera]);

  const handleSend = React.useCallback(async () => {
    if (!blob || uploading) return;
    if (blob.size > MAX_SIZE) {
      toast.error("Видео слишком большое (макс. 10 МБ)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "circle.webm");
      fd.append("chatId", chatId);
      fd.append("type", "VIDEO_CIRCLE");
      const res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("upload_failed");
      toast.success("Видео-круг отправлен");
      onSent();
      onClose();
    } catch {
      toast.error("Не удалось отправить видео");
    } finally {
      setUploading(false);
    }
  }, [blob, uploading, chatId, onSent, onClose]);

  if (!mounted || !open) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3">
      <div className="relative flex h-full max-h-[680px] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <header className="flex h-12 items-center gap-2 border-b border-border px-3">
          <Video className="h-5 w-5 text-primary" />
          <h2 className="flex-1 text-base font-semibold">Видео-круг</h2>
          <button
            type="button"
            onClick={() => { stopStream(); onClose(); }}
            disabled={uploading}
            aria-label="Закрыть"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-full bg-black">
            {previewUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={previewUrl}
                controls
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {recording && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-500">
                {formatTime(duration)} / {formatTime(MAX_DURATION)}
              </span>
            </div>
          )}

          {previewUrl && !recording && (
            <div className="mt-3 text-center text-sm text-muted-foreground">
              Длительность: {formatTime(duration)}
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={() => { stopStream(); onClose(); }}
            disabled={uploading}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            Отмена
          </button>
          <div className="flex-1" />
          {previewUrl && !recording ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Заново
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Отправить
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={!stream || uploading}
              className={cn(
                "inline-flex h-14 w-14 items-center justify-center rounded-full border-4 transition-all",
                recording
                  ? "border-red-500 bg-red-500/20 scale-110"
                  : "border-primary bg-primary/20 hover:bg-primary/30",
                !stream && "opacity-50",
              )}
            >
              <div
                className={cn(
                  "rounded-full transition-all",
                  recording ? "h-6 w-6 bg-red-500" : "h-10 w-10 bg-primary",
                )}
              />
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
